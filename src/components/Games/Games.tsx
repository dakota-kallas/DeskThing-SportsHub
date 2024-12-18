import { useEffect, useRef, useState } from 'react';
import { SportsHubData } from '../../stores/sportsHubStore';
import './games.css';
import GameSmall from '../Game/PreGame/GameSmall';

interface GamesProps {
  sportsHubData: SportsHubData | null;
}

const Games = ({ sportsHubData }: GamesProps) => {
  const [isTallEnough, setIsTallEnough] = useState(false);
  const contentContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = contentContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.target === container) {
          setIsTallEnough(entry.contentRect.height > 400);
        }
      }
    });

    resizeObserver.observe(container);

    // Cleanup observer on component unmount
    return () => {
      resizeObserver.unobserve(container);
      resizeObserver.disconnect();
    };
  }, [contentContainerRef.current]);

  if (!sportsHubData?.allGames || sportsHubData?.allGames?.length === 0) {
    return (
      <div className='messageContainer'>
        <p className='message'>No games found for today</p>
        <p>If you we're expecting some, double-check your Settings</p>
      </div>
    );
  }

  return (
    <div className='contentContainer' ref={contentContainerRef}>
      <div className='gamesContainer gamesContainer--small'>
        {GetGameNodes()}
      </div>
    </div>
  );

  function GetGameNodes() {
    return sportsHubData?.allGames?.map((game) => (
      <GameSmall key={game.gameId} gameData={game} />
    ));
  }
};

export default Games;
