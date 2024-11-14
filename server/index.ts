import {
  DeskThing as DK,
  SettingsMultiSelect,
  SettingsNumber,
  SettingsSelect,
  SocketData,
} from 'deskthing-server';
const DeskThing = DK.getInstance();
export { DeskThing }; // Required export of this exact name for the server to connect
import SportsHubService from './sportsHub';

const start = async () => {
  const sportsHub = SportsHubService.getInstance();
  let Data = await DeskThing.getData();
  DeskThing.on('data', (newData) => {
    // Syncs the data with the server
    Data = newData;
    if (Data) {
      sportsHub.updateData(Data);
    }
  });

  // This is how to add settings (implementation may vary)
  if (!Data?.settings?.refreshInterval) {
    setupSettings();
  }

  const handleGet = async (request: SocketData) => {
    if (request.request === 'sportshub_data') {
      DeskThing.sendLog('Getting Sports Hub data');
      const sportsData = await sportsHub.getSportsHub();
      if (sportsData) {
        DeskThing.sendDataToClient({
          type: 'sportshub_data',
          payload: sportsData,
        });
      } else {
        console.warn('Error getting Sports Hub data');
      }
    }
  };

  DeskThing.on('get', handleGet);
  const stop = async () => {
    sportsHub.stop();
  };
  DeskThing.on('stop', stop);
};

const setupSettings = async () => {
  const refreshIntervalSetting = {
    label: 'Refresh Interval (minutes)',
    description: 'The amount of minutes between each refresh.',
    type: 'number',
    value: 1,
    max: 60,
    min: 1,
  } as SettingsNumber;

  const favoriteLeagueSetting = {
    label: 'Favorite League',
    value: 'NONE',
    type: 'select',
    options: [
      { label: 'None', value: 'NONE' },
      { label: 'NFL', value: 'NFL' },
      { label: 'NBA', value: 'NBA' },
      { label: 'MLS', value: 'MLS' },
    ],
  } as SettingsSelect;

  const leaguesToShowSetting = {
    label: 'Leagues To Show',
    value: ['NFL', 'NBA', 'MLS'],
    type: 'multiselect',
    options: [
      { label: 'NFL', value: 'NFL' },
      { label: 'NBA', value: 'NBA' },
      { label: 'MLS', value: 'MLS' },
    ],
  } as SettingsMultiSelect;

  const favoriteNBATeamsSetting = {
    label: 'Favorite NBA Teams',
    value: [],
    type: 'multiselect',
    options: [
      { label: 'Atlanta Hawks', value: 'ATL' },
      { label: 'Brooklyn Nets', value: 'BKN' },
      { label: 'Boston Celtics', value: 'BOS' },
      { label: 'Charlotte Hornets', value: 'CHA' },
      { label: 'Chicago Bulls', value: 'CHI' },
      { label: 'Cleveland Cavaliers', value: 'CLE' },
      { label: 'Dallas Mavericks', value: 'DAL' },
      { label: 'Denver Nuggets', value: 'DEN' },
      { label: 'Detroit Pistons', value: 'DET' },
      { label: 'Golden State Warriors', value: 'GSW' },
      { label: 'Houston Rockets', value: 'HOU' },
      { label: 'Indiana Pacers', value: 'IND' },
      { label: 'Los Angeles Clippers', value: 'LAC' },
      { label: 'Los Angeles Lakers', value: 'LAL' },
      { label: 'Memphis Grizzlies', value: 'MEM' },
      { label: 'Miami Heat', value: 'MIA' },
      { label: 'Milwaukee Bucks', value: 'MIL' },
      { label: 'Minnesota Timberwolves', value: 'MIN' },
      { label: 'New Orleans Pelicans', value: 'NOH' },
      { label: 'New York Knicks', value: 'NYK' },
      { label: 'Oklahoma City Thunder', value: 'OKC' },
      { label: 'Orlando Magic', value: 'ORL' },
      { label: 'Philadelphia 76ers', value: 'PHI' },
      { label: 'Phoenix Suns', value: 'PHO' },
      { label: 'Portland Trail Blazers', value: 'POR' },
      { label: 'Sacramento Kings', value: 'SAC' },
      { label: 'Toronto Raptors', value: 'TOR' },
      { label: 'Utah Jazz', value: 'UTH' },
      { label: 'Washington Wizards', value: 'WAS' },
    ],
  } as SettingsMultiSelect;

  const favoriteNFLTeamsSetting = {
    label: 'Favorite NFL Teams',
    value: [],
    type: 'multiselect',
    options: [
      { label: 'Arizona Cardinals', value: 'ARI' },
      { label: 'Atlanta Falcons', value: 'ATL' },
      { label: 'Baltimore Ravens', value: 'BAL' },
      { label: 'Buffalo Bills', value: 'BUF' },
      { label: 'Carolina Panthers', value: 'CAR' },
      { label: 'Chicago Bears', value: 'CHI' },
      { label: 'Cincinnati Bengals', value: 'CIN' },
      { label: 'Cleveland Browns', value: 'CLE' },
      { label: 'Dallas Cowboys', value: 'DAL' },
      { label: 'Denver Broncos', value: 'DEN' },
      { label: 'Detroit Lions', value: 'DET' },
      { label: 'Green Bay Packers', value: 'GB' },
      { label: 'Houston Texans', value: 'HOU' },
      { label: 'Indianapolis Colts', value: 'IND' },
      { label: 'Jacksonville Jaguars', value: 'JAX' },
      { label: 'Kansas City Chiefs', value: 'KC' },
      { label: 'Miami Dolphins', value: 'MIA' },
      { label: 'Minnesota Vikings', value: 'MIN' },
      { label: 'New England Patriots', value: 'NE' },
      { label: 'New Orleans Saints', value: 'NO' },
      { label: 'New York Giants', value: 'NYG' },
      { label: 'New York Jets', value: 'NYJ' },
      { label: 'Las Vegas Raiders', value: 'LV' },
      { label: 'Philadelphia Eagles', value: 'PHI' },
      { label: 'Pittsburgh Steelers', value: 'PIT' },
      { label: 'Los Angeles Chargers', value: 'LAC' },
      { label: 'San Francisco 49ers', value: 'SF' },
      { label: 'Seattle Seahawks', value: 'SEA' },
      { label: 'Los Angeles Rams', value: 'LAR' },
      { label: 'Tampa Bay Buccaneers', value: 'TB' },
      { label: 'Tennessee Titans', value: 'TEN' },
      { label: 'Washington Commanders', value: 'WAS' },
    ],
  } as SettingsMultiSelect;

  const favoriteMLSTeamsSetting = {
    label: 'Favorite MLS Teams',
    value: [],
    type: 'multiselect',
    options: [
      { label: 'Atlanta United', value: 'ATL' },
      { label: 'Austin FC', value: 'ATX' },
      { label: 'CF Montreal', value: 'MTL' },
      { label: 'Charlotte FC', value: 'CLT' },
      { label: 'Chicago Fire', value: 'CHI' },
      { label: 'Colorado Rapids', value: 'COL' },
      { label: 'Columbus Crew SC', value: 'CLB' },
      { label: 'D.C. United', value: 'DC' },
      { label: 'FC Cincinnati', value: 'CIN' },
      { label: 'FC Dallas', value: 'DAL' },
      { label: 'Houston Dynamo', value: 'HOU' },
      { label: 'Inter Miami', value: 'MIA' },
      { label: 'Los Angeles FC', value: 'LAN' },
      { label: 'Los Angeles Galaxy', value: 'LA' },
      { label: 'Minnesota United FC', value: 'MIN' },
      { label: 'Nashville SC', value: 'NSH' },
      { label: 'New England Revolution', value: 'NE' },
      { label: 'New York City', value: 'NYC' },
      { label: 'New York Red Bulls', value: 'NYR' },
      { label: 'Orlando City', value: 'ORL' },
      { label: 'Philadelphia Union', value: 'PHI' },
      { label: 'Portland Timbers', value: 'POR' },
      { label: 'Real Salt Lake', value: 'RSL' },
      { label: 'San Jose Earthquakes', value: 'SJ' },
      { label: 'Seattle Sounders', value: 'SEA' },
      { label: 'Sporting Kansas City', value: 'SKC' },
      { label: 'St Louis City SC', value: 'STL' },
      { label: 'Toronto FC', value: 'TOR' },
      { label: 'Vancouver Whitecaps', value: 'VAN' },
    ],
  } as SettingsMultiSelect;

  DeskThing.addSettings({
    refreshInterval: refreshIntervalSetting,
    favoriteLeague: favoriteLeagueSetting,
    leaguesToShow: leaguesToShowSetting,
    favoriteNBATeams: favoriteNBATeamsSetting,
    favoriteNFLTeams: favoriteNFLTeamsSetting,
    favoriteMLSTeams: favoriteMLSTeamsSetting,
  });
};

// Main Entrypoint of the server
DeskThing.on('start', start);
