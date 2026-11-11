-- Allow Tic-Tac-Toe rooms in the shared game_rooms table.
alter table public.game_rooms
  drop constraint if exists game_rooms_game_check;

alter table public.game_rooms
  add constraint game_rooms_game_check
  check (game in ('bingo', 'dots', 'papergun', 'tictactoe'));
