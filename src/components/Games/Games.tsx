import { useEffect, useRef, useState } from 'react';
import { GameStatusType, SportsHubData } from '../../stores/sportsHubStore';
import './games.css';
import PreGame, { GameDisplaySize } from '../Game/PreGame';

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

  return (
    <div className='contentContainer' ref={contentContainerRef}>
      <div className='gamesContainer gamesContainer--small'>
        {GetGameNodes()}
      </div>
    </div>
  );

  function GetGameNodes() {
    return sportsHubData?.games.map((game) => {
      switch (game.statusType) {
        case GameStatusType.Pregame:
          return (
            <PreGame
              key={game.gameId}
              gameData={game}
              size={GameDisplaySize.Small}
            />
          );
        default:
          return null;
      }
    });
  }
};

export default Games;
