/* S11 Game table: boards, players in seat order around an oval with
   badges, the status line, the action panel for the viewer's phase, and
   the bottom bar. Every value comes from projectView(state, viewer), so a
   phone only ever shows what its player is allowed to see (spec Sec 8).
   Policy hands, veto, powers, chaos and game over get their own screens
   in Step 8. */
import { useEffect, useState } from "react"
import { useRouter } from "expo-router"
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import {
  getChancellorEligibility,
  getPlayerCount,
  getVoteRevealer,
  PHASE_AWAIT_HOST_REVEAL,
  PHASE_NOMINATION,
  PHASE_VOTING,
  projectView,
  VOTE_NO,
  VOTE_YES,
} from "@game/engine"
import type { PlayerId, Vote } from "@game/engine"
import { actionLabels, colors, fontFamily, fontSize, gameCopy, HAPTIC_SELECTION, radii, spacing, voteLabels, type BadgeKind } from "@game/theme"
import { ActionPanel } from "../src/components/ActionPanel.js"
import { Ballot } from "../src/components/Ballot.js"
import { Button } from "../src/components/Button.js"
import { ElectionTracker } from "../src/components/ElectionTracker.js"
import { FascistTrack } from "../src/components/FascistTrack.js"
import { LiberalTrack } from "../src/components/LiberalTrack.js"
import { RevealedBallots } from "../src/components/RevealedBallots.js"
import { Seat } from "../src/components/Seat.js"
import { StatusLine } from "../src/components/StatusLine.js"
import { Toast } from "../src/components/Toast.js"
import { ovalSeatSpots } from "../src/game/ovalLayout.js"
import { statusLineFor } from "../src/game/statusLine.js"
import { useGameStore } from "../src/game/store.js"
import { playHaptic } from "../src/lib/haptics.js"

const TABLE_HEIGHT = 440
const VOTE_OPTIONS: Vote[] = [VOTE_YES, VOTE_NO]
const SEAT_WIDTH = 70
const SEAT_HEIGHT = 104
const CLOSE_VOTING_MS = 120000
const TABLE_MAX_WIDTH = 360

export default function TableScreen() {
  const router = useRouter()
  const state = useGameStore((store) => store.state)
  const names = useGameStore((store) => store.names)
  const hostId = useGameStore((store) => store.hostId)
  const viewerId = useGameStore((store) => store.viewerId)
  const testTable = useGameStore((store) => store.testTable)
  const lastReveal = useGameStore((store) => store.lastReveal)
  const error = useGameStore((store) => store.error)
  const perform = useGameStore((store) => store.perform)
  const setViewer = useGameStore((store) => store.setViewer)
  const clearError = useGameStore((store) => store.clearError)
  const { width } = useWindowDimensions()
  const [ballot, setBallot] = useState<Vote | null>(null)
  const [canCloseVoting, setCanCloseVoting] = useState(testTable)

  useEffect(() => {
    if (testTable || state?.phase !== PHASE_VOTING) {
      setCanCloseVoting(testTable)
      return
    }
    setCanCloseVoting(false)
    const timer = setTimeout(() => setCanCloseVoting(true), CLOSE_VOTING_MS)
    return () => clearTimeout(timer)
  }, [state?.phase, testTable])

  useEffect(() => {
    setBallot(null)
  }, [state?.phase, viewerId])

  if (!state || !viewerId || hostId === null) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>{gameCopy.logEmpty}</Text>
        <Button label={actionLabels.home} onPress={() => router.replace("/home")} />
      </View>
    )
  }

  const me: PlayerId = viewerId
  const view = projectView(state, me)
  const name = (id: PlayerId | null): string => (id === null ? "" : names[id] ?? id)
  const revealerId =
    state.phase === PHASE_AWAIT_HOST_REVEAL
      ? getVoteRevealer(state.playerIds, hostId, state.alivePlayers, new Set(state.alivePlayers))
      : null
  const isAlive = view.alivePlayers.includes(viewerId)
  const hasVoted = view.votedPlayerIds.includes(viewerId)
  const ovalWidth = Math.min(width - spacing.lg * 2, TABLE_MAX_WIDTH)
  const spots = ovalSeatSpots(state.playerIds.length, ovalWidth, TABLE_HEIGHT, SEAT_WIDTH, SEAT_HEIGHT)

  function badgesFor(id: PlayerId): BadgeKind[] {
    const badges: BadgeKind[] = []
    if (id === state?.presidentId) badges.push("president")
    if (id === state?.lastElectedChancellorId) badges.push("chancellor")
    if (id === state?.chancellorNomineeId && state.phase !== PHASE_NOMINATION) badges.push("nominee")
    if (id === state?.lastElectedPresidentId) badges.push("termLimited")
    if (view.votedPlayerIds.includes(id) && state?.phase === PHASE_VOTING) badges.push("voted")
    if (!view.alivePlayers.includes(id)) badges.push("executed")
    if (view.investigatedPlayerIds.includes(id)) badges.push("investigated")
    if (view.notHitlerBadges.includes(id)) badges.push("notHitler")
    if (id === hostId) badges.push("host")
    return badges
  }

  const eligibleChancellors = state.playerIds.filter(
    (id) =>
      getChancellorEligibility(id, state.presidentId, state.alivePlayers, state.lastElectedPresidentId, state.lastElectedChancellorId).eligible,
  )

  function choose(next: Vote) {
    playHaptic(HAPTIC_SELECTION)
    setBallot(next)
  }

  function renderAction() {
    if (!isAlive) {
      return <Text style={styles.waiting}>{gameCopy.executedBanner}</Text>
    }
    if (state?.phase === PHASE_NOMINATION && view.presidentId === viewerId) {
      return (
        <View style={styles.actionStack}>
          <Text style={styles.waiting}>{gameCopy.chooseChancellor}</Text>
          {eligibleChancellors.map((id) => (
            <Button key={id} label={gameCopy.nominate(name(id))} onPress={() => perform(me, { type: "nominate", targetId: id })} />
          ))}
        </View>
      )
    }
    if (state?.phase === PHASE_VOTING) {
      if (hasVoted) {
        return <Text style={styles.waiting}>{gameCopy.voteCast}</Text>
      }
      return (
        <View style={styles.actionStack}>
          <Text style={styles.waiting}>{gameCopy.voteQuestion}</Text>
          <View style={styles.ballotRow}>
            {VOTE_OPTIONS.map((option) => (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityLabel={voteLabels[option]}
                accessibilityState={{ checked: ballot === option }}
                onPress={() => choose(option)}
                style={[styles.ballotChoice, ballot === option && styles.ballotChoiceSelected]}
              >
                <Ballot vote={option} />
                <Text style={styles.ballotLabel}>{voteLabels[option]}</Text>
              </Pressable>
            ))}
          </View>
          <Button
            label={actionLabels.castVote}
            disabled={ballot === null}
            onPress={() => {
              if (ballot !== null) perform(me, { type: "vote", vote: ballot })
            }}
          />
          {viewerId === hostId && (
            <Button label={actionLabels.closeVoting} variant="secondary" disabled={!canCloseVoting} onPress={() => perform(me, { type: "closeVoting" })} />
          )}
        </View>
      )
    }
    if (state?.phase === PHASE_AWAIT_HOST_REVEAL) {
      if (revealerId === viewerId) {
        return (
          <View style={styles.actionStack}>
            <Text style={styles.waiting}>{gameCopy.allVotesIn(view.alivePlayers.length)}</Text>
            <Button label={actionLabels.revealVotes} onPress={() => perform(me, { type: "reveal" })} />
          </View>
        )
      }
      return <Text style={styles.waiting}>{gameCopy.waitingForReveal(name(revealerId))}</Text>
    }
    return null
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {testTable && (
          <View style={styles.testTable}>
            <Text style={styles.testTableText}>{gameCopy.testTableBanner}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {state.playerIds.map((id) => (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityLabel={gameCopy.passPhone(name(id))}
                  onPress={() => setViewer(id)}
                  style={[styles.chip, id === viewerId && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, id === viewerId && styles.chipTextSelected]}>{name(id)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.boards}>
          <Text style={styles.boardLabel}>{gameCopy.liberalTrack}</Text>
          <LiberalTrack enactedCount={view.liberalPoliciesEnacted} />
          <Text style={styles.boardLabel}>{gameCopy.fascistTrack}</Text>
          <FascistTrack playerCount={getPlayerCount(state)} enactedCount={view.fascistPoliciesEnacted} />
          <View style={styles.trackerRow}>
            <ElectionTracker tracker={view.electionTracker} />
            <Text style={styles.counts}>{gameCopy.failedElections}</Text>
          </View>
          <Text style={styles.counts}>{gameCopy.drawAndDiscard(view.drawPileCount, view.discardPileCount)}</Text>
        </View>

        <View style={[styles.oval, { width: ovalWidth, height: TABLE_HEIGHT }]}>
          {state.playerIds.map((id, index) => {
            const spot = spots[index]
            if (!spot) return null
            return (
              <View key={id} style={[styles.seatSlot, { left: spot.left, top: spot.top }]}>
                <Seat name={name(id)} badges={badgesFor(id)} compact />
              </View>
            )
          })}
        </View>

        <StatusLine text={statusLineFor(view, names, revealerId)} />

        {lastReveal && (
          <View style={styles.revealBox}>
            <Text style={styles.boardLabel}>{gameCopy.ballotsRevealed}</Text>
            <RevealedBallots
              entries={state.playerIds
                .filter((id) => lastReveal.votes[id] !== undefined)
                .map((id) => ({ name: name(id), vote: lastReveal.votes[id] as Vote }))}
            />
            <Text style={styles.waiting}>
              {lastReveal.elected
                ? gameCopy.revealedElected(lastReveal.yes, lastReveal.no)
                : gameCopy.revealedRejected(lastReveal.yes, lastReveal.no, lastReveal.failedCount, 3)}
            </Text>
          </View>
        )}

        {error && (
          <Pressable onPress={clearError} accessibilityRole="button" accessibilityLabel={gameCopy.dismiss}>
            <Toast text={error} tone="danger" />
          </Pressable>
        )}

        <ActionPanel>{renderAction()}</ActionPanel>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button label={gameCopy.log} variant="secondary" onPress={() => router.push("/log")} />
        <Button label={gameCopy.myRole} variant="secondary" onPress={() => router.push("/role")} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  fallback: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.lg,
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  fallbackText: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    color: colors.textOnDarkMuted,
    textAlign: "center",
  },
  testTable: {
    gap: spacing.sm,
  },
  testTableText: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.sm,
    color: colors.accent,
  },
  chips: {
    gap: spacing.sm,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    borderRadius: radii.control,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  chipSelected: {
    backgroundColor: colors.accent,
  },
  chipText: {
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.sm,
    color: colors.accent,
  },
  chipTextSelected: {
    color: colors.ink,
  },
  boards: {
    gap: spacing.sm,
  },
  boardLabel: {
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.sm,
    color: colors.textOnDarkMuted,
  },
  trackerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  counts: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.sm,
    color: colors.textOnDarkMuted,
  },
  oval: {
    alignSelf: "center",
  },
  seatSlot: {
    position: "absolute",
  },
  revealBox: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.control,
    backgroundColor: colors.surfaceRaised,
  },
  waiting: {
    fontFamily: fontFamily.interface,
    fontSize: fontSize.md,
    color: colors.textOnDarkMuted,
    textAlign: "center",
  },
  actionStack: {
    gap: spacing.md,
  },
  ballotRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
  },
  ballotChoice: {
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.sm,
    minHeight: 44,
    borderRadius: radii.control,
    borderWidth: 2,
    borderColor: colors.border,
  },
  ballotChoiceSelected: {
    borderColor: colors.accent,
  },
  ballotLabel: {
    fontFamily: fontFamily.interfaceSemiBold,
    fontSize: fontSize.sm,
    color: colors.textOnDark,
  },
  bottomBar: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surfaceRecessed,
  },
})
