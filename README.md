# MTG Solitaire Playtester

A mobile-first React sandbox for manually playtesting two Magic: The Gathering decks on one phone screen. It imports two decklists, looks up card images on Scryfall, lets you draw and move cards between zones, tracks life, supports tap states and counters, and persists the current game in localStorage.

This is not a rules engine. It does not validate legal moves, phases, mana, combat, triggers, the stack, or damage.

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Open the local Vite URL shown in the terminal.

## Sample Decklist

Paste one list for each player. Lines like these are supported:

```txt
Deck
4 Llanowar Elves
4 Elvish Mystic
4 Reclamation Sage
4 Beast Whisperer
4 Collected Company
4 Forest
4 Overgrown Tomb
4 Blooming Marsh
4 Llanowar Wastes
4 Nykthos, Shrine to Nyx
```

The import modal also includes sample buttons for both players.

## Build

```bash
npm run build
```
