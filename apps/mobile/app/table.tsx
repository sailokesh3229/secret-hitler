/* S11 Game table: boards, players in seat order around an oval with badges,
   the status line, the action panel for the viewer's phase, and the bottom
   bar. Every value comes from the viewer's view (server game:view in a real
   game, or the local engine's projection in a test table), so a phone only
   shows what its player may see (spec Sec 8). */
import { useEffect, useState } from "react"
import { useRouter } from "expo-router"
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import {
  PHASE_AWAIT_HOST_REVEAL,
  PHASE_CHANCELLOR_POLICIES,
  PHASE_GAME_OVER,
  PHASE_NOMINATION,
  PHASE_PRESIDENT_POLICIES,
  PHASE_PRESIDENTIAL_POWER,
  PHASE_VETO_RESPONSE,
  PHASE_VOTING,
  VOTE_NO,
  VOTE_YES,
} from "@game/engine"
import type { PlayerCount, PlayerId, Vote } from "@game/engine"
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
import { Countdown } from "../src/components/Countdown.js"
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
  const view = useGameStore((store) => store.view)
  const names = useGameStore((store) => store.names)
  const hostId = useGameStore((store) => store.hostId)
  const revealerId = useGameStore((store) => store.revealerId)
  const testTable = useGameStore((store) => store.testTable)
  const lastReveal = useGameStore((store) => store.lastReveal)
  const chaos = useGameStore((store) => store.chaos)
  const roomMode = useGameStore((store) => store.roomMode)
  const deadlineAt = useGameStore((store) => store.deadlineAt)
  const connection = useGameStore((store) => store.connection)
  const error = useGameStore((store) => store.error)
  const act = useGameStore((store) => store.act)
  const setViewer = useGameStore((store) => store.setViewer)
  const clearError = useGameStore((store) => store.clearError)
  const { width } = useWindowDimensions()
  const [ballot, setBallot] = useState<Vote | null>(null)
  const [canCloseVoting, setCanCloseVoting] = useState(testTable)

  const phase = view?.phase
  useEffect(() => {
    if (testTable || phase !== PHASE_VOTING) {
      setCanCloseVoting(testTable)
      return
    }
    setCanCloseVoting(false)
    const timer = setTimeout(() => setCanCloseVoting(true), CLOSE_VOTING_MS)
    return () => clearTimeout(timer)
  }, [phase, testTable])

  useEffect(() => {
    setBallot(null)
  }, [phase, view?.viewerId])

  useEffect(() => {
    if (chaos) router.push("/chaos")
  }, [chaos?.id, router])

  useEffect(() => {
    if (phase === PHASE_GAME_OVER) router.replace("/game-over")
  }, [phase, router])

  if (!view) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>{connection === "offline" ? gameCopy.offlineTable : gameCopy.logEmpty}</Text>
        <Button label={actionLabels.home} onPress={() => router.replace("/home")} />
      </View>
    )
  }

  const me: PlayerId = view.viewerId
  const alive = view.alivePlayers
  const seatIds = view.seats
  const name = (id: PlayerId | null): string => (id === null ? "" : names[id] ?? id)
  const isAlive = alive.includes(me)
  const hasVoted = view.votedPlayerIds.includes(me)
  const ovalWidth = Math.min(width - spacing.lg * 2, TABLE_MAX_WIDTH)
  const spots = ovalSeatSpots(seatIds.length, ovalWidth, TABLE_HEIGHT, SEAT_WIDTH, SEAT_HEIGHT)
  const playerCount = seatIds.length as PlayerCount

  function badgesFor(id: PlayerId): BadgeKind[] {
    const badges: BadgeKind[] = []
    if (id === view?.presidentId) badges.push("president")
    if (id === view?.lastElectedChancellorId) badges.push("chancellor")
    if (id === view?.chancellorNomineeId && phase !== PHASE_NOMINATION) badges.push("nominee")
    if (id === view?.lastElectedPresidentId) badges.push("termLimited")
    if (view?.votedPlayerIds.includes(id) && phase === PHASE_VOTING) badges.push("voted")
    if (!alive.includes(id)) badges.push("executed")
    if (view?.investigatedPlayerIds.includes(id)) badges.push("investigated")
    if (view?.notHitlerBadges.includes(id)) badges.push("notHitler")
    if (id === hostId) badges.push("host")
    return badges
  }

  const eligibleChancellors = seatIds.filter(
    (id) =>
      id !== view.presidentId &&
      alive.includes(id) &&
      id !== view.lastElectedChancellorId &&
      !(alive.length > 5 && id === view.lastElectedPresidentId),
  )

  function choose(next: Vote) {
    playHaptic(HAPTIC_SELECTION)
    setBallot(next)
  }

  function renderAction() {
    if (!isAlive) {
      return <Text style={styles.waiting}>{gameCopy.executedBanner}</Text>
    }
    if (phase === PHASE_NOMINATION && view?.presidentId === me) {
      return (
        <View style={styles.actionStack}>
          <Text style={styles.waiting}>{gameCopy.chooseChancellor}</Text>
          {eligibleChancellors.map((id) => (
            <Button key={id} label={gameCopy.nominate(name(id))} onPress={() => void act({ type: "nominate", targetId: id })} />
          ))}
        </View>
      )
    }
    if (phase === PHASE_VOTING) {
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
                style={[styles.ballotChoice, ballot === option ? styles.ballotChoiceSelected : styles.ballotChoiceIdle]}
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
              if (ballot !== null) void act({ type: "vote", vote: ballot })
            }}
          />
          {me === hostId && (
            <Button label={actionLabels.closeVoting} variant="secondary" disabled={!canCloseVoting} onPress={() => void act({ type: "closeVoting" })} />
          )}
        </View>
      )
    }
    if (phase === PHASE_PRESIDENT_POLICIES && view?.presidentId === me) {
      return <Button label={gameCopy.openPolicyHand} onPress={() => router.push("/policies")} />
    }
    if (phase === PHASE_CHANCELLOR_POLICIES && view?.chancellorNomineeId === me) {
      return <Button label={gameCopy.openPolicyHand} onPress={() => router.push("/policies")} />
    }
    if (phase === PHASE_VETO_RESPONSE && view?.presidentId === me) {
      return <Button label={gameCopy.openVetoAnswer} onPress={() => router.push("/veto")} />
    }
    if (phase === PHASE_PRESIDENTIAL_POWER) {
      return <Button label={gameCopy.openPowerScreen} onPress={() => router.push("/power")} />
    }
    if (phase === PHASE_AWAIT_HOST_REVEAL) {
      if (revealerId === me) {
        return (
          <View style={styles.actionStack}>
            <Text style={styles.waiting}>{gameCopy.allVotesIn(alive.length)}</Text>
            <Button label={actionLabels.revealVotes} onPress={() => void act({ type: "reveal" })} />
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
              {seatIds.map((id) => (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityLabel={gameCopy.passPhone(name(id))}
                  onPress={() => setViewer(id)}
                  style={[styles.chip, id === me && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, id === me && styles.chipTextSelected]}>{name(id)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {connection === "offline" && <Toast text={gameCopy.reconnecting} tone="danger" />}

        <View style={styles.boards}>
          <Text style={styles.boardLabel}>{gameCopy.liberalTrack}</Text>
          <LiberalTrack enactedCount={view.liberalPoliciesEnacted} />
          <Text style={styles.boardLabel}>{gameCopy.fascistTrack}</Text>
          <FascistTrack playerCount={playerCount} enactedCount={view.fascistPoliciesEnacted} />
          <View style={styles.trackerRow}>
            <ElectionTracker tracker={view.electionTracker} />
            <Text style={styles.counts}>{gameCopy.failedElections}</Text>
          </View>
          <Text style={styles.counts}>{gameCopy.drawAndDiscard(view.drawPileCount, view.discardPileCount)}</Text>
        </View>

        <View style={[styles.oval, { width: ovalWidth, height: TABLE_HEIGHT }]}>
          {seatIds.map((id, index) => {
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
        {deadlineAt !== null && <Countdown deadlineAt={deadlineAt} />}

        {lastReveal && (
          <View style={styles.revealBox}>
            <Text style={styles.boardLabel}>{gameCopy.ballotsRevealed}</Text>
            <RevealedBallots
              entries={seatIds
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
        {(testTable || roomMode === "MODE_ONLINE") && <Button label={gameCopy.chatTitle} variant="secondary" onPress={() => router.push("/chat")} />}
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
  },
  ballotChoiceIdle: {
    borderColor: colors.background,
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
