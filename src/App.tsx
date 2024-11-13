import React, { useEffect, useState } from 'react';
import { SportsHubStore } from './stores';
import { SportsHubData } from './stores/sportsHubStore';
import Games from './components/Games/Games';
import Header from './components/Header/Header';

const App: React.FC = () => {
  const sportsHubStore = SportsHubStore;
  const [sportsHubData, setSportsHubData] = useState<SportsHubData | null>(
    sportsHubStore.getSportsHubData()
  );

  useEffect(() => {
    const handleSportsHubData = async (data: SportsHubData | null) => {
      if (!data) {
        console.log('No Sports Hub data available');
        return;
      }
      console.log('Sports Hub data updated:', data);
      setSportsHubData(data);
    };

    const removeListener = sportsHubStore.on(handleSportsHubData);

    return () => {
      removeListener();
    };
  }, []);

  return (
    <div className='appContainer w-screen h-screen'>
      <Header lastUpdated={sportsHubData?.lastUpdated} />
      <Games sportsHubData={sportsHubData} />
    </div>
  );
};

export default App;
