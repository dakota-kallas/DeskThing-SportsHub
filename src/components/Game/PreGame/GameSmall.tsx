import { Game as GameData, League } from '../../../stores/sportsHubStore';
import nbaLogo from '../../../assets/logo/nba.png';
import nflLogo from '../../../assets/logo/nfl.png';
import mlsLogo from '../../../assets/logo/mls.png';
import ncaafLogo from '../../../assets/logo/ncaaf.png';
import nhlLogo from '../../../assets/logo/nhl.png';
import serieALogo from '../../../assets/logo/seriea.png';
import laLigaLogo from '../../../assets/logo/laliga.png';
import championsLeagueLogo from '../../../assets/logo/championsleague.png';
import './gamesmall.css';

interface GameSmallProps {
  gameData: GameData;
}

const GameSmall = ({ gameData }: GameSmallProps) => {
  let logo;

  switch (gameData.league) {
    case League.NBA:
      logo = nbaLogo;
      break;
    case League.NFL:
      logo = nflLogo;
      break;
    case League.NCAAF:
      logo = ncaafLogo;
      break;
    case League.MLS:
      logo = mlsLogo;
      break;
    case League.NHL:
      logo = nhlLogo;
      break;
    case League.SerieA:
      logo = serieALogo;
      break;
    case League.LaLiga:
      logo = laLigaLogo;
      break;
    case League.ChampionsLeague:
      logo = championsLeagueLogo;
      break;
    default:
      logo = '';
      break;
  }

  let status;
  switch (gameData.statusType) {
    case 'pregame':
      status = gameData.startTime;
      break;
    case 'in_progress':
    case 'postponed':
    case 'final':
      status = gameData.status;
      break;
    default:
      status = '';
      break;
  }

  let homeData;
  switch (gameData.statusType) {
    case 'pregame':
      homeData = gameData.homeTeam.record;
      break;
    case 'in_progress':
    case 'postponed':
    case 'final':
      homeData = gameData.homeScore;
      break;
    default:
      homeData = '';
      break;
  }

  let awayData;
  switch (gameData.statusType) {
    case 'pregame':
      awayData = gameData.awayTeam.record;
      break;
    case 'in_progress':
    case 'postponed':
    case 'final':
      awayData = gameData.awayScore;
      break;
    default:
      awayData = '';
      break;
  }

  let recordClass = 'team--record';
  if (
    gameData.league === League.MLS ||
    gameData.league === League.SerieA ||
    gameData.league === League.LaLiga ||
    gameData.league === League.ChampionsLeague
  ) {
    recordClass += ' team--smallText';
  }

  const league = gameData.league.replace(/([a-z])([A-Z])/g, '$1 $2');

  return (
    <div className='game game--small'>
      <div className='game--head'>
        <img className='league--logo' src={logo} />
        <p className='game--time'>{status}</p>
      </div>
      <div className='game--matchup'>
        <div className='team'>
          <div className='team--info'>
            <img className='team--logo' src={gameData.homeTeam.logo} />
            <div className='team--name'>
              <p className='team--firstName'>{gameData.homeTeam.firstName}</p>
              <p className='team--lastName'>{gameData.homeTeam.lastName}</p>
            </div>
          </div>
          <p className={recordClass}>{homeData}</p>
        </div>
        <div className='team'>
          <div className='team--info'>
            <img className='team--logo' src={gameData.awayTeam.logo} />
            <div className='team--name'>
              <p className='team--firstName'>{gameData.awayTeam.firstName}</p>
              <p className='team--lastName'>{gameData.awayTeam.lastName}</p>
            </div>
          </div>
          <p className={recordClass}>{awayData}</p>
        </div>
      </div>
      <div className='game--info'>
        <p>{league}</p>
        {gameData.tvCoverage && <p>TV: {gameData.tvCoverage}</p>}
      </div>
    </div>
  );
};

export default GameSmall;
