// CHARTS
import testSongChart from "../assets/charts/test-song.json";
import letsGoGamblingChartPlayer from "../assets/charts/lets-go-gambling-player.json";
import letsGoGamblingChartOpponent from "../assets/charts/lets-go-gambling-opponent.json";
import partyChaosChartPlayer from "../assets/charts/party-chaos-player.json"
import partyChaosChartOpponent from "../assets/charts/party-chaos-opponent.json"
import fightOrFlightChartPlayer from "../assets/charts/fight-or-flight-player.json";
import fightOrFlightChartOpponent from "../assets/charts/fight-or-flight-opponent.json";
import castleChorusChartPlayer from "../assets/charts/castle-chorus-player.json";
import castleChorusChartOpponent from "../assets/charts/castle-chorus-opponent.json";
import lastStopChartPlayer from "../assets/charts/last-stop-player.json";
import lastStopChartOpponent from "../assets/charts/last-stop-opponent.json";

// MÚSICAS
import testSongAudio from "../assets/audio/musics/menu-theme.mp3";
import letsGoGamblingSongAudio from "../assets/audio/musics/lets-go-gambling.ogg";
import partyChaosSongAudio from "../assets/audio/musics/party-chaos.ogg";
import dontDealWithMeSongAudio from "../assets/audio/musics/dont-deal-with-me.ogg";
import greenEntrySongAudio from "../assets/audio/musics/green-entry.ogg";
import fightOrFlightSongAudio from "../assets/audio/musics/fight-or-flight.ogg";
import noMercySongAudio from "../assets/audio/musics/no-mercy.ogg";
import firstEncounterSongAudio from "../assets/audio/musics/first-encounter.ogg";
import meatGrinderSongAudio from "../assets/audio/musics/meat-grinder.ogg";
import castleChorusSongAudio from "../assets/audio/musics/castle-chorus.ogg";
import lastStopSongAudio from "../assets/audio/musics/last-stop.ogg";

//ÍCONES
import kingDiceIcon from "../assets/images/ui/king-dice-icon.png";
import hornetIcon from "../assets/images/ui/hornet-icon.png";
import v1Icon from "../assets/images/ui/v1-icon.png";
import secretIcon from "../assets/images/ui/secret-icon.png";

// FUNDOS
import tutorialBg from "../assets/images/backgrounds/tutorial.jpg";
import letsGoGamblingBg from "../assets/images/backgrounds/lets-go-gambling.jpg";
import fightOrFlightBg from "../assets/images/backgrounds/fight-or-flight.jpg";
import castleChorusBg from "../assets/images/backgrounds/castle-chorus.jpg";
import lastStopBg from "../assets/images/backgrounds/last-stop.jpg";

export const WEEKS = [
  {
    id: "tutorial",
    title: "TUTORIAL",
    songs: [
      {
        id: "test-song",
        icon: kingDiceIcon,
        playerChart: testSongChart,
        opponentChart: testSongChart,
        audio: testSongAudio,
        bg: tutorialBg,
        // sprite: "opponent-sprite-path",
      },
    ],
  },
  {
    id: "week-1",
    title: "WEEK 1",
    songs: [
      {
        id: "lets-go-gambling",
        icon: kingDiceIcon,
        playerChart: letsGoGamblingChartPlayer,
        opponentChart: letsGoGamblingChartOpponent,
        audio: letsGoGamblingSongAudio,
        bg: letsGoGamblingBg,
        // sprite: "opponent-sprite-path",
      },
      {
        id: "party-chaos",
        icon: kingDiceIcon,
        playerChart: partyChaosChartPlayer,
        opponentChart: partyChaosChartOpponent,
        audio: partyChaosSongAudio,
        bg: letsGoGamblingBg,
        // sprite: "opponent-sprite-path",
      },
      {
        id: "dont-deal-with-me",
        icon: kingDiceIcon,
        playerChart: letsGoGamblingChartPlayer,
        opponentChart: letsGoGamblingChartOpponent,
        audio: dontDealWithMeSongAudio,
        bg: letsGoGamblingBg,
        // sprite: "opponent-sprite-path",
      },
    ],
  },
  {
    id: "week-2",
    title: "WEEK 2",
    songs: [
      {
        id: "green-entry",
        icon: hornetIcon,
        playerChart: fightOrFlightChartPlayer,
        opponentChart: fightOrFlightChartOpponent,
        audio: greenEntrySongAudio,
        bg: fightOrFlightBg,
        // sprite: "opponent-sprite-path",
      },
      {
        id: "fight-or-flight",
        icon: hornetIcon,
        playerChart: fightOrFlightChartPlayer,
        opponentChart: fightOrFlightChartOpponent,
        audio: fightOrFlightSongAudio,
        bg: fightOrFlightBg,
        // sprite: "opponent-sprite-path",
      },
      {
        id: "no-mercy",
        icon: hornetIcon,
        playerChart: fightOrFlightChartPlayer,
        opponentChart: fightOrFlightChartOpponent,
        audio: noMercySongAudio,
        bg: fightOrFlightBg,
        // sprite: "opponent-sprite-path",
      },
    ],
  },
  {
    id: "week-3",
    title: "WEEK 3",
    songs: [
      {
        id: "first-encounter",
        icon: v1Icon,
        playerChart: castleChorusChartPlayer,
        opponentChart: castleChorusChartOpponent,
        audio: firstEncounterSongAudio,
        bg: castleChorusBg,
        // sprite: "opponent-sprite-path",
      },
      {
        id: "meat-grinder",
        icon: v1Icon,
        playerChart: castleChorusChartPlayer,
        opponentChart: castleChorusChartOpponent,
        audio: meatGrinderSongAudio,
        bg: castleChorusBg,
        // sprite: "opponent-sprite-path",
      },
      {
        id: "castle-chorus",
        icon: v1Icon,
        playerChart: castleChorusChartPlayer,
        opponentChart: castleChorusChartOpponent,
        audio: castleChorusSongAudio,
        bg: castleChorusBg,
        // sprite: "opponent-sprite-path",
      },
    ],
  },
];

export const SECRET_SONGS = [
  {
    id: "last-stop",
    icon: secretIcon,
    playerChart: lastStopChartPlayer,
    opponentChart: lastStopChartOpponent,
    audio: lastStopSongAudio,
    bg: lastStopBg,
    isSecret: true,
    // sprite: "opponent-sprite-path",
  },
];

export const ALL_FREEPLAY_SONGS = [
  ...WEEKS.flatMap((week) => week.songs),
  ...SECRET_SONGS,
];
