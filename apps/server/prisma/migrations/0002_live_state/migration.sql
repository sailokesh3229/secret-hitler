CREATE TABLE "live_rooms" (
    "code" TEXT NOT NULL,
    "state" JSONB NOT NULL,

    CONSTRAINT "live_rooms_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "live_values" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "live_values_pkey" PRIMARY KEY ("key")
);
