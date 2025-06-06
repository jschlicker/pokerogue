import { BattlerIndex } from "#app/battle";
import { Abilities } from "#app/enums/abilities";
import { Moves } from "#app/enums/moves";
import { Species } from "#app/enums/species";
import GameManager from "#test/testUtils/gameManager";
import Phaser from "phaser";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("Abilities - Tera Shell", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;

  beforeAll(() => {
    phaserGame = new Phaser.Game({
      type: Phaser.HEADLESS,
    });
  });

  afterEach(() => {
    game.phaseInterceptor.restoreOg();
  });

  beforeEach(() => {
    game = new GameManager(phaserGame);
    game.override
      .battleStyle("single")
      .ability(Abilities.TERA_SHELL)
      .moveset([Moves.SPLASH])
      .enemySpecies(Species.SNORLAX)
      .enemyAbility(Abilities.INSOMNIA)
      .enemyMoveset([Moves.MACH_PUNCH])
      .startingLevel(100)
      .enemyLevel(100);
  });

  it("should change the effectiveness of non-resisted attacks when the source is at full HP", async () => {
    await game.classicMode.startBattle([Species.SNORLAX]);

    const playerPokemon = game.scene.getPlayerPokemon()!;
    vi.spyOn(playerPokemon, "getMoveEffectiveness");

    game.move.select(Moves.SPLASH);

    await game.phaseInterceptor.to("MoveEndPhase");
    expect(playerPokemon.getMoveEffectiveness).toHaveLastReturnedWith(0.5);

    await game.toNextTurn();

    game.move.select(Moves.SPLASH);

    await game.phaseInterceptor.to("MoveEndPhase");
    expect(playerPokemon.getMoveEffectiveness).toHaveLastReturnedWith(2);
  });

  it("should not override type immunities", async () => {
    game.override.enemyMoveset([Moves.SHADOW_SNEAK]);

    await game.classicMode.startBattle([Species.SNORLAX]);

    const playerPokemon = game.scene.getPlayerPokemon()!;
    vi.spyOn(playerPokemon, "getMoveEffectiveness");

    game.move.select(Moves.SPLASH);

    await game.phaseInterceptor.to("MoveEndPhase");
    expect(playerPokemon.getMoveEffectiveness).toHaveLastReturnedWith(0);
  });

  it("should not override type multipliers less than 0.5x", async () => {
    game.override.enemyMoveset([Moves.QUICK_ATTACK]);

    await game.classicMode.startBattle([Species.AGGRON]);

    const playerPokemon = game.scene.getPlayerPokemon()!;
    vi.spyOn(playerPokemon, "getMoveEffectiveness");

    game.move.select(Moves.SPLASH);

    await game.phaseInterceptor.to("MoveEndPhase");
    expect(playerPokemon.getMoveEffectiveness).toHaveLastReturnedWith(0.25);
  });

  it("should not affect the effectiveness of fixed-damage moves", async () => {
    game.override.enemyMoveset([Moves.DRAGON_RAGE]);

    await game.classicMode.startBattle([Species.CHARIZARD]);

    const playerPokemon = game.scene.getPlayerPokemon()!;
    const spy = vi.spyOn(playerPokemon, "getMoveEffectiveness");

    game.move.select(Moves.SPLASH);

    await game.phaseInterceptor.to("BerryPhase", false);
    expect(spy).toHaveLastReturnedWith(1);
    expect(playerPokemon.hp).toBe(playerPokemon.getMaxHp() - 40);

    spy.mockRestore();
  });

  it("should change the effectiveness of all strikes of a multi-strike move", async () => {
    game.override.enemyMoveset([Moves.DOUBLE_HIT]);

    await game.classicMode.startBattle([Species.SNORLAX]);

    const playerPokemon = game.scene.getPlayerPokemon()!;
    const spy = vi.spyOn(playerPokemon, "getMoveEffectiveness");

    game.move.select(Moves.SPLASH);

    await game.setTurnOrder([BattlerIndex.ENEMY, BattlerIndex.PLAYER]);
    await game.move.forceHit();
    for (let i = 0; i < 2; i++) {
      await game.phaseInterceptor.to("MoveEffectPhase");
      expect(spy).toHaveLastReturnedWith(0.5);
    }
    expect(spy).toHaveReturnedTimes(2);
    spy.mockRestore();
  });
});
