# Party Arena (Next.js + Supabase)

Full-stack Next.js (App Router) + Supabase conversion of **Party Arena** featuring four real-time multiplayer party games:

1. **Bingo 25** – 5×5 multiplayer Bingo with secret cards, player/host number calling, and AI bots.
2. **Dots & Boxes** – Classic grid line-drawing game (4×4 to 9×9), combo turns, optional turn timers, and AI bots.
3. **Paper Gun Battle** – 9-stage tactical sketch duel with dice choices, secret shields, and AI bots.
4. **Tic-Tac-Toe** – Private two-player rooms, alternating X/O turns, win/draw detection, and rematch score tracking.

---

## Quick Setup

### 1. Create the Supabase table

Open your project in the **Supabase Dashboard → SQL Editor** and run the migrations in order:

- [`supabase/migrations/0001_game_rooms.sql`](./supabase/migrations/0001_game_rooms.sql)
- [`supabase/migrations/0002_add_tictactoe_game.sql`](./supabase/migrations/0002_add_tictactoe_game.sql)

This creates the `public.game_rooms` table with Row Level Security enabled and locks down direct client access so secret state (opponent Bingo cards, Paper Gun shields) is only ever read by the server and sanitized per viewer.

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and paste your project's keys from **Supabase Dashboard → Project Settings → API**:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT-REF.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_ANON_OR_PUBLISHABLE_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_OR_SECRET_KEY"
```

### 3. Install & run

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.
