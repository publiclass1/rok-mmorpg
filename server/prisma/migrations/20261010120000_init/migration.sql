-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(20) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `display_name` VARCHAR(191) NULL,
    `save_map_id` VARCHAR(191) NOT NULL DEFAULT 'prontera',
    `save_x` DOUBLE NOT NULL DEFAULT 480,
    `save_y` DOUBLE NOT NULL DEFAULT 360,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `characters` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slot` SMALLINT NOT NULL,
    `map_id` VARCHAR(191) NOT NULL DEFAULT 'prontera',
    `x` DOUBLE NOT NULL DEFAULT 480,
    `y` DOUBLE NOT NULL DEFAULT 360,
    `zeny` INTEGER NOT NULL DEFAULT 1000,
    `is_gm` BOOLEAN NOT NULL DEFAULT false,
    `gender` VARCHAR(191) NOT NULL DEFAULT 'male',
    `body_color` SMALLINT NOT NULL DEFAULT 2,
    `hair_color` SMALLINT NOT NULL DEFAULT 1,
    `eye_color` SMALLINT NOT NULL DEFAULT 0,
    `clothes_color` SMALLINT NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `characters_name_key`(`name`),
    UNIQUE INDEX `characters_user_id_slot_key`(`user_id`, `slot`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `items` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `stack_max` INTEGER NOT NULL,
    `item_type` VARCHAR(191) NULL,
    `weight` INTEGER NULL,
    `equip_slot` VARCHAR(191) NULL,
    `metadata` JSON NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account_storage` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `item_id` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,

    UNIQUE INDEX `account_storage_user_id_item_id_key`(`user_id`, `item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `character_inventory` (
    `id` VARCHAR(191) NOT NULL,
    `character_id` VARCHAR(191) NOT NULL,
    `item_id` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,

    UNIQUE INDEX `character_inventory_character_id_item_id_key`(`character_id`, `item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `npc_definitions` (
    `id` VARCHAR(191) NOT NULL,
    `map_id` VARCHAR(191) NOT NULL,
    `x` DOUBLE NOT NULL,
    `y` DOUBLE NOT NULL,
    `npc_type` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `config` JSON NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `character_progress` (
    `character_id` VARCHAR(191) NOT NULL,
    `job_id` VARCHAR(191) NOT NULL DEFAULT 'novice',
    `base_level` SMALLINT NOT NULL DEFAULT 1,
    `base_exp` INTEGER NOT NULL DEFAULT 0,
    `job_level` SMALLINT NOT NULL DEFAULT 1,
    `job_exp` INTEGER NOT NULL DEFAULT 0,
    `str` SMALLINT NOT NULL DEFAULT 1,
    `agi` SMALLINT NOT NULL DEFAULT 1,
    `vit` SMALLINT NOT NULL DEFAULT 1,
    `stat_int` SMALLINT NOT NULL DEFAULT 1,
    `dex` SMALLINT NOT NULL DEFAULT 1,
    `luk` SMALLINT NOT NULL DEFAULT 1,
    `stat_points_unspent` INTEGER NOT NULL DEFAULT 0,
    `skill_points_unspent` INTEGER NOT NULL DEFAULT 0,
    `hp` INTEGER NULL,
    `mp` INTEGER NULL,
    `skill_bar` JSON NOT NULL,
    `session_inventory` JSON NOT NULL,
    `rolled_items` JSON NOT NULL,
    `active_rental` JSON NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`character_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `character_skills` (
    `character_id` VARCHAR(191) NOT NULL,
    `skill_id` VARCHAR(191) NOT NULL,
    `level` SMALLINT NOT NULL,

    PRIMARY KEY (`character_id`, `skill_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `character_equipment` (
    `character_id` VARCHAR(191) NOT NULL,
    `slot` VARCHAR(191) NOT NULL,
    `item_id` VARCHAR(191) NOT NULL,
    `instance_id` VARCHAR(191) NULL,

    PRIMARY KEY (`character_id`, `slot`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trade_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `initiator_character_id` VARCHAR(191) NOT NULL,
    `partner_character_id` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `initiator_confirmed` BOOLEAN NOT NULL DEFAULT false,
    `partner_confirmed` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trade_offers` (
    `id` VARCHAR(191) NOT NULL,
    `trade_session_id` VARCHAR(191) NOT NULL,
    `character_id` VARCHAR(191) NOT NULL,
    `item_id` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `zeny` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parties` (
    `id` VARCHAR(191) NOT NULL,
    `leader_character_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL DEFAULT 'Party',
    `exp_share` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_members` (
    `party_id` VARCHAR(191) NOT NULL,
    `character_id` VARCHAR(191) NOT NULL,
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `party_members_party_id_idx`(`party_id`),
    PRIMARY KEY (`character_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_requests` (
    `id` VARCHAR(191) NOT NULL,
    `party_id` VARCHAR(191) NOT NULL,
    `from_character_id` VARCHAR(191) NOT NULL,
    `to_character_id` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `party_requests_to_character_id_status_idx`(`to_character_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `guilds` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `tag` VARCHAR(4) NOT NULL,
    `leader_character_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `guilds_name_key`(`name`),
    UNIQUE INDEX `guilds_tag_key`(`tag`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `guild_members` (
    `guild_id` VARCHAR(191) NOT NULL,
    `character_id` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'member',
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `guild_members_guild_id_idx`(`guild_id`),
    PRIMARY KEY (`character_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_stalls` (
    `character_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL DEFAULT 'Shop',
    `map_id` VARCHAR(191) NOT NULL,
    `x` DOUBLE NOT NULL DEFAULT 0,
    `y` DOUBLE NOT NULL DEFAULT 0,
    `is_open` BOOLEAN NOT NULL DEFAULT false,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `vendor_stalls_map_id_is_open_idx`(`map_id`, `is_open`),
    PRIMARY KEY (`character_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_listings` (
    `id` VARCHAR(191) NOT NULL,
    `character_id` VARCHAR(191) NOT NULL,
    `item_id` VARCHAR(191) NOT NULL,
    `price` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,

    INDEX `vendor_listings_character_id_idx`(`character_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `duel_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `challenger_character_id` VARCHAR(191) NOT NULL,
    `opponent_character_id` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `map_id` VARCHAR(191) NOT NULL,
    `fight_starts_at` DATETIME(3) NULL,
    `challenger_name` VARCHAR(191) NOT NULL,
    `challenger_job_id` VARCHAR(191) NOT NULL,
    `challenger_base_level` SMALLINT NOT NULL,
    `challenger_snapshot` JSON NULL,
    `opponent_snapshot` JSON NULL,
    `challenger_hp` INTEGER NULL,
    `opponent_hp` INTEGER NULL,
    `challenger_hp_max` INTEGER NULL,
    `opponent_hp_max` INTEGER NULL,
    `last_attack_at` DATETIME(3) NULL,
    `winner_character_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dungeon_instances` (
    `id` VARCHAR(191) NOT NULL,
    `party_id` VARCHAR(191) NOT NULL,
    `floor_id` VARCHAR(191) NOT NULL,
    `map_id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `killed_spawns` JSON NOT NULL,
    `total_spawns` INTEGER NOT NULL DEFAULT 0,
    `mvp_alive` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `dungeon_instances_party_id_idx`(`party_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dungeon_reward_claims` (
    `instance_id` VARCHAR(191) NOT NULL,
    `character_id` VARCHAR(191) NOT NULL,
    `zeny` INTEGER NOT NULL,
    `base_exp` INTEGER NOT NULL,
    `job_exp` INTEGER NOT NULL,

    PRIMARY KEY (`instance_id`, `character_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `character_presence` (
    `character_id` VARCHAR(191) NOT NULL,
    `map_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `last_seen` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `character_presence_map_id_last_seen_idx`(`map_id`, `last_seen`),
    PRIMARY KEY (`character_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `character_audit_log` (
    `id` VARCHAR(191) NOT NULL,
    `character_id` VARCHAR(191) NOT NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `detail` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `character_audit_log_character_id_created_at_idx`(`character_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `field_spawn_kill_locks` (
    `mapId` VARCHAR(191) NOT NULL,
    `spawn_index` INTEGER NOT NULL,
    `locked_until` DATETIME(3) NOT NULL,
    `last_killer_character_id` VARCHAR(191) NULL,
    `mob_def_id` VARCHAR(191) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`mapId`, `spawn_index`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `field_map_drops` (
    `id` VARCHAR(191) NOT NULL,
    `map_id` VARCHAR(191) NOT NULL,
    `item_id` VARCHAR(191) NOT NULL,
    `x` DOUBLE NOT NULL,
    `y` DOUBLE NOT NULL,
    `owner_character_id` VARCHAR(191) NOT NULL,
    `available_at` DATETIME(3) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `collected_at` DATETIME(3) NULL,
    `collected_by_character_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `field_map_drops_map_id_expires_at_idx`(`map_id`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `game_settings` (
    `key` VARCHAR(191) NOT NULL,
    `value` DECIMAL(12, 4) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `characters` ADD CONSTRAINT `characters_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_storage` ADD CONSTRAINT `account_storage_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_storage` ADD CONSTRAINT `account_storage_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `character_inventory` ADD CONSTRAINT `character_inventory_character_id_fkey` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `character_inventory` ADD CONSTRAINT `character_inventory_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `character_progress` ADD CONSTRAINT `character_progress_character_id_fkey` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `character_skills` ADD CONSTRAINT `character_skills_character_id_fkey` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `character_equipment` ADD CONSTRAINT `character_equipment_character_id_fkey` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `character_equipment` ADD CONSTRAINT `character_equipment_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trade_sessions` ADD CONSTRAINT `trade_sessions_initiator_character_id_fkey` FOREIGN KEY (`initiator_character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trade_sessions` ADD CONSTRAINT `trade_sessions_partner_character_id_fkey` FOREIGN KEY (`partner_character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trade_offers` ADD CONSTRAINT `trade_offers_trade_session_id_fkey` FOREIGN KEY (`trade_session_id`) REFERENCES `trade_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trade_offers` ADD CONSTRAINT `trade_offers_character_id_fkey` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trade_offers` ADD CONSTRAINT `trade_offers_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parties` ADD CONSTRAINT `parties_leader_character_id_fkey` FOREIGN KEY (`leader_character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_members` ADD CONSTRAINT `party_members_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_members` ADD CONSTRAINT `party_members_character_id_fkey` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_requests` ADD CONSTRAINT `party_requests_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_requests` ADD CONSTRAINT `party_requests_from_character_id_fkey` FOREIGN KEY (`from_character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_requests` ADD CONSTRAINT `party_requests_to_character_id_fkey` FOREIGN KEY (`to_character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `guilds` ADD CONSTRAINT `guilds_leader_character_id_fkey` FOREIGN KEY (`leader_character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `guild_members` ADD CONSTRAINT `guild_members_guild_id_fkey` FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `guild_members` ADD CONSTRAINT `guild_members_character_id_fkey` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_stalls` ADD CONSTRAINT `vendor_stalls_character_id_fkey` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_listings` ADD CONSTRAINT `vendor_listings_character_id_fkey` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_listings` ADD CONSTRAINT `vendor_listings_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `duel_sessions` ADD CONSTRAINT `duel_sessions_challenger_character_id_fkey` FOREIGN KEY (`challenger_character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `duel_sessions` ADD CONSTRAINT `duel_sessions_opponent_character_id_fkey` FOREIGN KEY (`opponent_character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `duel_sessions` ADD CONSTRAINT `duel_sessions_winner_character_id_fkey` FOREIGN KEY (`winner_character_id`) REFERENCES `characters`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dungeon_instances` ADD CONSTRAINT `dungeon_instances_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dungeon_reward_claims` ADD CONSTRAINT `dungeon_reward_claims_instance_id_fkey` FOREIGN KEY (`instance_id`) REFERENCES `dungeon_instances`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dungeon_reward_claims` ADD CONSTRAINT `dungeon_reward_claims_character_id_fkey` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `character_presence` ADD CONSTRAINT `character_presence_character_id_fkey` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `character_audit_log` ADD CONSTRAINT `character_audit_log_character_id_fkey` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `field_spawn_kill_locks` ADD CONSTRAINT `field_spawn_kill_locks_last_killer_character_id_fkey` FOREIGN KEY (`last_killer_character_id`) REFERENCES `characters`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `field_map_drops` ADD CONSTRAINT `field_map_drops_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `field_map_drops` ADD CONSTRAINT `field_map_drops_owner_character_id_fkey` FOREIGN KEY (`owner_character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `field_map_drops` ADD CONSTRAINT `field_map_drops_collected_by_character_id_fkey` FOREIGN KEY (`collected_by_character_id`) REFERENCES `characters`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
