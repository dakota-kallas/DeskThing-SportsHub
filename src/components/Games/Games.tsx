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

  // sportsHubData?.mlsGames.forEach((element) => {
  //   console.log(
  //     `${element.homeTeam.firstName} ${element.homeTeam.abbreviation}`
  //   );
  //   console.log(
  //     `${element.awayTeam.firstName} ${element.awayTeam.abbreviation}`
  //   );
  // });

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
