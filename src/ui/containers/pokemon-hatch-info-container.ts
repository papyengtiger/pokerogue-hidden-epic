import { globalScene } from "#app/global-scene";
import { getStarterColors } from "#app/global-vars/starter-colors";
import { speciesEggMoves } from "#balance/egg-moves";
import { allMoves } from "#data/data-lists";
import { getEggTierForSpecies } from "#data/egg";
import type { EggHatchData } from "#data/egg-hatch-data";
import { Gender } from "#data/gender";
import { getMarkData } from "#data/mark";
import { MarkId } from "#enums/mark-id";
import { SpeciesId } from "#enums/species-id";
import { TextStyle } from "#enums/text-style";
import { PokemonType } from "#enums/pokemon-type";
import type { PlayerPokemon } from "#field/pokemon";
import { addTextObject } from "#ui/text";
import { padInt, rgbHexToRgba } from "#utils/common";
import { getPokemonSpeciesForm } from "#utils/pokemon-utils";
import { argbFromRgba } from "@material/material-color-utilities";
import { PokemonInfoContainer } from "./pokemon-info-container";

/**
 * Class for the hatch info summary of each pokemon
 * Holds an info container as well as an additional egg sprite, name, egg moves and main sprite
 */
export class PokemonHatchInfoContainer extends PokemonInfoContainer {
  private currentPokemonSprite: Phaser.GameObjects.Sprite;
  private pokemonNumberText: Phaser.GameObjects.Text;
  private pokemonNameText: Phaser.GameObjects.Text;
  private pokemonHatchedIcon: Phaser.GameObjects.Sprite;
  private pokemonListContainer: Phaser.GameObjects.Container;
  private pokemonCandyIcon: Phaser.GameObjects.Sprite;
  private pokemonCandyOverlayIcon: Phaser.GameObjects.Sprite;
  private pokemonCandyCountText: Phaser.GameObjects.Text;
  private pokemonMarkText: Phaser.GameObjects.Text;


  constructor(listContainer: Phaser.GameObjects.Container, x = 115, y = 9) {
    super(x, y);
    this.pokemonListContainer = listContainer;
  }
  setup(): void {
    super.setup();
    super.changeToEggSummaryLayout();

    this.currentPokemonSprite = globalScene.add.sprite(54, 80, "pkmn__sub");
    this.currentPokemonSprite.setScale(0.8);
    this.currentPokemonSprite.setPipeline(globalScene.spritePipeline, {
      tone: [0.0, 0.0, 0.0, 0.0],
      ignoreTimeTint: true,
    });
    this.pokemonListContainer.add(this.currentPokemonSprite);

    // setup name and number
    this.pokemonNumberText = addTextObject(84, 107, "0000", TextStyle.EGG_SUMMARY_DEX, { fontSize: 78 });
    this.pokemonNumberText.setOrigin(0, 0);
    this.pokemonListContainer.add(this.pokemonNumberText);

    this.pokemonNameText = addTextObject(7, 109, "", TextStyle.EGG_SUMMARY_NAME, { fontSize: 64 });
    this.pokemonNameText.setOrigin(0, 0);
    this.pokemonListContainer.add(this.pokemonNameText);

    // setup egg icon and candy count
    this.pokemonHatchedIcon = globalScene.add.sprite(-5, 90, "egg_icons");
    this.pokemonHatchedIcon.setOrigin(0, 0.2);
    this.pokemonHatchedIcon.setScale(0.8);
    this.pokemonListContainer.add(this.pokemonHatchedIcon);

    this.pokemonMarkText = addTextObject(7, 101, "", TextStyle.SUMMARY, { fontSize: "40px" });

    this.pokemonMarkText.setOrigin(0, 0);
    this.pokemonMarkText.setVisible(false);
    this.pokemonListContainer.add(this.pokemonMarkText);

    this.pokemonCandyIcon = globalScene.add.sprite(4.5, 40, "candy");
    this.pokemonCandyIcon.setScale(0.5);
    this.pokemonCandyIcon.setOrigin(0, 0);
    this.pokemonListContainer.add(this.pokemonCandyIcon);

    this.pokemonCandyOverlayIcon = globalScene.add.sprite(4.5, 40, "candy_overlay");
    this.pokemonCandyOverlayIcon.setScale(0.5);
    this.pokemonCandyOverlayIcon.setOrigin(0, 0);
    this.pokemonListContainer.add(this.pokemonCandyOverlayIcon);

    this.pokemonCandyCountText = addTextObject(14, 40, "x0", TextStyle.SUMMARY, { fontSize: "56px" });
    this.pokemonCandyCountText.setOrigin(0, 0);
    this.pokemonListContainer.add(this.pokemonCandyCountText);

    this.pokemonEggMoveContainer = globalScene.add.container(0, 0);
this.pokemonEggMoveContainer.setScale(0.44);
this.pokemonEggMoveContainer.setVisible(false);

this.pokemonEggMoveBg = globalScene.add.nineslice(
  70,
  0,
  "type_bgs",
  "unknown",
  92,
  14,
  2,
  2,
  2,
  2,
);
this.pokemonEggMoveBg.setOrigin(1, 0);

this.pokemonEggMoveLabel = addTextObject(
  70 - this.pokemonEggMoveBg.width / 2,
  0,
  "",
  TextStyle.MOVE_LABEL,
);
this.pokemonEggMoveLabel.setOrigin(0.5, 0);

this.pokemonEggMoveContainer.add([
  this.pokemonEggMoveBg,
  this.pokemonEggMoveLabel,
]);

super.add(this.pokemonEggMoveContainer);
  }

  /**
   * Disable the sprite (and replace with substitute)
   */
  hideDisplayPokemon() {
    this.currentPokemonSprite.setVisible(false);
  }

  /**
   * Display a given pokemon sprite with animations
   * assumes the specific pokemon sprite has already been loaded
   */
  displayPokemon(pokemon: PlayerPokemon) {
    const species = pokemon.species;
    const female = pokemon.gender === Gender.FEMALE;
    const formIndex = pokemon.formIndex;
    const shiny = pokemon.shiny;
    const variant = pokemon.variant;
    this.currentPokemonSprite.setVisible(false);
    species.loadAssets(female, formIndex, shiny, variant, true).then(() => {
      getPokemonSpeciesForm(species.speciesId, pokemon.formIndex).cry();
      this.currentPokemonSprite.play(species.getSpriteKey(female, formIndex, shiny, variant));
      this.currentPokemonSprite.setPipelineData("shiny", shiny);
      this.currentPokemonSprite.setPipelineData("variant", variant);
      this.currentPokemonSprite.setPipelineData("spriteKey", species.getSpriteKey(female, formIndex, shiny, variant));
      this.currentPokemonSprite.setVisible(true);
    });
  }

  /**
   * Updates the info container with the appropriate dex data and starter entry from the hatchInfo
   * Also updates the displayed name, number, egg moves and main animated sprite for the pokemon
   * @param hatchInfo The EggHatchData of the pokemon / new hatch to show
   */
  showHatchInfo(hatchInfo: EggHatchData) {

    const pokemon = hatchInfo.pokemon;
    const species = pokemon.species;
    this.displayPokemon(pokemon);

    super.show(pokemon, false, 1, hatchInfo.getDex(), hatchInfo.getStarterEntry(), true);
    const colorScheme = getStarterColors(species.speciesId);

    this.pokemonCandyIcon.setTint(argbFromRgba(rgbHexToRgba(colorScheme[0])));
    this.pokemonCandyIcon.setVisible(true);
    this.pokemonCandyOverlayIcon.setTint(argbFromRgba(rgbHexToRgba(colorScheme[1])));
    this.pokemonCandyOverlayIcon.setVisible(true);
    this.pokemonCandyCountText.setText(`×${globalScene.gameData.starterData[species.speciesId].candyCount}`);
    this.pokemonCandyCountText.setVisible(true);

    this.pokemonNumberText.setText(padInt(species.speciesId, 4));
    this.pokemonNameText.setText(species.name);

    if (pokemon.mark !== MarkId.NONE) {
      const markData = getMarkData(pokemon.mark);

      this.pokemonNameText.setFontSize("44px").setText(`${markData.title}\n${species.name}`);
    } else {
      this.pokemonNameText.setFontSize("64px").setText(species.name);
    }

    const rootSpeciesId = species.getRootSpeciesId();
const eggMoveId =
  speciesEggMoves[rootSpeciesId]?.[hatchInfo.eggMoveIndex];

const eggMove =
  eggMoveId !== undefined
    ? allMoves[eggMoveId]
    : null;

// 이번 부화로 새로 해금된 알기술만 표시
if (eggMove && hatchInfo.eggMoveUnlocked) {
  this.pokemonEggMoveBg.setFrame(
    PokemonType[eggMove.type].toString().toLowerCase(),
  );

  this.pokemonEggMoveLabel.setText(`(+) ${eggMove.name}`);
  this.pokemonEggMoveContainer.setVisible(true);
} else {
  // 이미 보유 중이던 알기술이 나온 경우에는 아무것도 표시하지 않음
  this.pokemonEggMoveLabel.setText("");
  this.pokemonEggMoveContainer.setVisible(false);
}
    // will always have at least one egg move

    if (species.speciesId === SpeciesId.MANAPHY || species.speciesId === SpeciesId.PHIONE) {
      this.pokemonHatchedIcon.setFrame("manaphy");
    } else {
      this.pokemonHatchedIcon.setFrame(getEggTierForSpecies(species));
    }
  }
}
