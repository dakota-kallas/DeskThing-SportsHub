import { Game as GameData } from '../../stores/sportsHubStore';
import nbaLogo from '../../assets/logo/nba.png';
import './pregame.css';

interface PreGameProps {
  gameData: GameData;
  size: GameDisplaySize;
}

export enum GameDisplaySize {
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
}

const PreGame = ({ gameData, size }: PreGameProps) => {
  return (
    <div className='game game--small'>
      <div className='game--head'>
        <img className='league--logo' src={nbaLogo} />
        <p className='game--time'>{gameData.status.toUpperCase()}</p>
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
          <p className='team--record'>{gameData.homeTeam.record}</p>
        </div>
        <div className='team'>
          <div className='team--info'>
            <img className='team--logo' src={gameData.awayTeam.logo} />
            <div className='team--name'>
              <p className='team--firstName'>{gameData.awayTeam.firstName}</p>
              <p className='team--lastName'>{gameData.awayTeam.lastName}</p>
            </div>
          </div>
          <p className='team--record'>{gameData.homeTeam.record}</p>
        </div>
        <div className='game--info'>
          <p>TV: {gameData.tvCoverage}</p>
        </div>
      </div>
    </div>
  );
};

export default PreGame;
