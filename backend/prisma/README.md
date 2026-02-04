# Prisma Schema Organization

This directory contains the Prisma database schema organized by domain for better maintainability.

## Structure

```
prisma/
├── README.md              # This file
└── schema/                # All schema files (separated by domain)
    ├── base.prisma       # Generator and datasource config
    ├── user.prisma       # User identity and ratings
    ├── game.prisma       # Game aggregate root
    ├── move.prisma       # Move history
    └── clock.prisma      # Time control
```

## Why Separate Files?

**Benefits:**

- **Domain Separation**: Each file represents a bounded context
- **Maintainability**: Easier to find and edit specific domain models
- **Team Collaboration**: Reduces merge conflicts
- **Documentation**: Clear domain boundaries

## Current Limitation

⚠️ **Note**: Prisma doesn't currently support schema file imports. All models must be in a single `schema.prisma` file.

**Workaround**: We maintain separate files in `schemas/` for organization, and manually consolidate them into `schema.prisma`.

## Domains

### 1. User Domain ([user.prisma](./schemas/user.prisma))

- `User` model: User accounts and authentication
- `Rating` model: ELO/ILO rating system

### 2. Game Domain ([game.prisma](./schemas/game.prisma))

- `Game` model: Game aggregate root
- Enums: `GameStatus`, `GameType`, `Winner`, `EndReason`

### 3. Move Domain ([move.prisma](./schemas/move.prisma))

- `Move` model: Immutable move history
- `Player` enum: WHITE or BLACK

### 4. Clock Domain ([clock.prisma](./schemas/clock.prisma))

- `Clock` model: Time control and game clocks

## Workflow

When editing schemas:

1. **Edit** the appropriate file in `schemas/` directory
2. **Copy** the changes to `schema.prisma` in the correct section
3. **Run** `npx prisma format` to format the schema
4. **Generate** client with `npx prisma generate`
5. **Create migration** with `npx prisma migrate dev`

## Future

When Prisma adds support for schema imports, we can use the separated files directly:

```prisma
// Future syntax (not yet supported)
import "./schemas/user.prisma"
import "./schemas/game.prisma"
import "./schemas/move.prisma"
import "./schemas/clock.prisma"
```

## Commands

```bash
# Format schema
npx prisma format

# Validate schema
npx prisma validate

# Generate Prisma Client
npx prisma generate

# Create migration
npx prisma migrate dev --name <migration_name>

# Apply migrations
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```
