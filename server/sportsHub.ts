import { DeskThing } from './index';
import { DataInterface } from 'deskthing-server';
import {
  Game,
  GameStatusType,
  SportsHubData,
  Team,
} from '../src/stores/sportsHubStore';

type League = 'NFL' | 'NBA' | 'MLS' | 'NCAAF';

const MLS = 'soccer.l.mls';
const PremierLeague = 'soccer.l.fbgb';

class SportsHubService {
  private sportsHubData: SportsHubData;
  private lastUpdateTime: Date | null;
  private updateTaskId: (() => void) | null = null;
  private deskthing: typeof DeskThing;
  private static instance: SportsHubService | null = null;
  private refreshInterval: number = 1;
  private leaguesToShow: string[] = [];
  private favoriteLeague: string = 'NONE';
  private favoriteNFLTeams: string[] = [];
  private selectedNCAAFTeams: string[] = [];
  private favoriteNBATeams: string[] = [];
  private favoriteMLSTeams: string[] = [];

  constructor() {
    this.deskthing = DeskThing;
    this.updateSportsHub();
    this.scheduleIntervalUpdates();
  }

  static getInstance(): SportsHubService {
    if (!SportsHubService.instance) {
      SportsHubService.instance = new SportsHubService();
    }
    return SportsHubService.instance;
  }

  private async updateSportsHub() {
    this.deskthing.sendLog(`Fetching Sports Hub data...`);
    const now = new Date();

    // Main logic
    let checkNBA = this.leaguesToShow.includes('NBA');
    let checkNFL = this.leaguesToShow.includes('NFL');
    let checkMLS = this.leaguesToShow.includes('MLS');
    let checkNCAAF = this.leaguesToShow.includes('NCAAF');

    // If the user has deselected a league, remove the data
    if (!checkMLS && this.sportsHubData?.mlsGames) {
      this.sportsHubData.mlsGames = undefined;
    }
    if (!checkNBA && this.sportsHubData?.nbaGames) {
      this.sportsHubData.nbaGames = undefined;
    }
    if (!checkNFL && this.sportsHubData?.nflGames) {
      this.sportsHubData.nflGames = undefined;
    }
    if (!checkNCAAF && this.sportsHubData?.ncaafGames) {
      this.sportsHubData.ncaafGames = undefined;
    }

    // Don't check for games in the specified set if the data already exists and was updated today and there are no live games
    if (
      this.sportsHubData &&
      this.lastUpdateTime?.getDate() === now.getDate()
    ) {
      this.deskthing.sendLog(
        'Sports Hub data already exists. Checking for live games...'
      );

      // Use the helper method for each league
      checkNBA = this.checkGames('NBA', 'nbaGames', checkNBA);
      checkNFL = this.checkGames('NFL', 'nflGames', checkNFL);
      checkMLS = this.checkGames('MLS', 'mlsGames', checkMLS);
      checkNCAAF = this.checkGames('NCAA Football', 'ncaafGames', checkNCAAF);
    } else {
      this.deskthing.sendLog(
        `No existing data found OR existing data is not from today. Fetching all games...`
      );
      this.sportsHubData = {} as SportsHubData;
      this.sportsHubData.nflGames = checkNFL ? [] : undefined;
      this.sportsHubData.nbaGames = checkMLS ? [] : undefined;
      this.sportsHubData.mlsGames = checkNBA ? [] : undefined;
      this.sportsHubData.ncaafGames = checkNCAAF ? [] : undefined;
    }

    // No matter the case, the allGames array should be reset
    this.sportsHubData.allGames = [];

    const localYear = now.getFullYear();
    const localMonth = String(now.getMonth() + 1).padStart(2, '0');
    const localDay = String(now.getDate()).padStart(2, '0');
    const localDate = `${localYear}-${localMonth}-${localDay}`;

    // Define the sorting order based on status type priority
    const statusOrder = {
      pregame: 2,
      in_progress: 1,
      final: 3,
      postponed: 4,
    };

    // Team: 'https://sports.yahoo.com/site/api/resource/sports.league.positionsteams;league=nba?lang=en-US&region=US';

    if (checkMLS) {
      this.deskthing.sendLog(`Fetching MLS games...`);
      const soccerUrl = `https://api-secure.sports.yahoo.com/v1/editorial/s/scoreboard?lang=en-US&region=US&leagues=soccer&date=${localDate}&v=2`;
      let mlsGames = await this.fetchData(soccerUrl, 'MLS');

      if (this.favoriteLeague !== 'NONE') {
        mlsGames = mlsGames.sort(
          (a, b) =>
            (statusOrder[a.statusType] ?? 0) - (statusOrder[b.statusType] ?? 0)
        );
      }

      this.sportsHubData.mlsGames = mlsGames;
    }

    if (checkNBA) {
      this.deskthing.sendLog(`Fetching NBA games...`);
      const nbaUrl = `https://api-secure.sports.yahoo.com/v1/editorial/s/scoreboard?lang=en-US&region=US&leagues=nba&date=${localDate}&v=2`;
      let nbaGames = await this.fetchData(nbaUrl, 'NBA');

      if (this.favoriteLeague !== 'NONE') {
        nbaGames = nbaGames.sort(
          (a, b) =>
            (statusOrder[a.statusType] ?? 0) - (statusOrder[b.statusType] ?? 0)
        );
      }

      this.sportsHubData.nbaGames = nbaGames;
    }

    if (checkNFL) {
      this.deskthing.sendLog(`Fetching NFL games...`);
      const nflUrl = encodeURI(
        `https://api-secure.sports.yahoo.com/v1/editorial/s/scoreboard?lang=en-US&region=US&leagues=nfl&season=current&sched_states=2&v=2&date=${localDate}`
      );
      let nflGames = await this.fetchData(nflUrl, 'NFL');

      if (this.favoriteLeague !== 'NONE') {
        nflGames = nflGames.sort(
          (a, b) =>
            (statusOrder[a.statusType] ?? 0) - (statusOrder[b.statusType] ?? 0)
        );
      }

      this.sportsHubData.nflGames = nflGames;
    }

    if (checkNCAAF) {
      this.deskthing.sendLog(`Fetching NCAA Football games...`);
      const ncaafUrl = encodeURI(
        `https://api-secure.sports.yahoo.com/v1/editorial/s/scoreboard?lang=en-US&region=US&leagues=ncaaf&date=${localDate}&v=2`
      );
      let ncaafGames = await this.fetchData(ncaafUrl, 'NCAAF');

      if (this.favoriteLeague !== 'NONE') {
        ncaafGames = ncaafGames.sort(
          (a, b) =>
            (statusOrder[a.statusType] ?? 0) - (statusOrder[b.statusType] ?? 0)
        );
      }

      this.sportsHubData.ncaafGames = ncaafGames;
    }

    this.sportsHubData.allGames = [
      ...(this.sportsHubData.nflGames ?? []),
      ...(this.sportsHubData.nbaGames ?? []),
      ...(this.sportsHubData.mlsGames ?? []),
      ...(this.sportsHubData.ncaafGames ?? []),
    ];

    if (this.favoriteLeague !== 'NONE') {
      this.sportsHubData.allGames = this.sportsHubData.allGames.sort((a, b) => {
        const aIsFavorite = this.favoriteLeague === a.league;
        const bIsFavorite = this.favoriteLeague === b.league;
        return aIsFavorite === bIsFavorite ? 0 : aIsFavorite ? -1 : 1;
      });
    }

    if (this.favoriteLeague === 'NONE') {
      this.sportsHubData.allGames = this.sportsHubData.allGames.sort(
        (a, b) =>
          (statusOrder[a.statusType] ?? 0) - (statusOrder[b.statusType] ?? 0)
      );
    }

    if (this.sportsHubData.nbaGames) {
      this.sportsHubData.allGames = this.sortGamesByFavoriteTeam(
        this.sportsHubData.allGames,
        this.favoriteNBATeams,
        'NBA'
      );

      this.sportsHubData.nbaGames = this.sortGamesByFavoriteTeam(
        this.sportsHubData.nbaGames,
        this.favoriteNBATeams,
        'NBA'
      );
    }

    if (this.sportsHubData.nflGames) {
      this.sportsHubData.allGames = this.sortGamesByFavoriteTeam(
        this.sportsHubData.allGames,
        this.favoriteNFLTeams,
        'NFL'
      );

      this.sportsHubData.nflGames = this.sortGamesByFavoriteTeam(
        this.sportsHubData.nflGames,
        this.favoriteNFLTeams,
        'NFL'
      );
    }

    // We don't need to sort favorite teams for NCAA Football since we're already filtering by favorite teams

    if (this.sportsHubData.mlsGames) {
      this.sportsHubData.allGames = this.sortGamesByFavoriteTeam(
        this.sportsHubData.allGames,
        this.favoriteMLSTeams,
        'MLS'
      );

      this.sportsHubData.mlsGames = this.sortGamesByFavoriteTeam(
        this.sportsHubData.mlsGames,
        this.favoriteMLSTeams,
        'MLS'
      );
    }

    // Sort again if the favorite league is set
    switch (this.favoriteLeague) {
      case 'NBA':
        this.sportsHubData.allGames = this.sortGamesByFavoriteTeam(
          this.sportsHubData.allGames,
          this.favoriteNBATeams,
          'NBA'
        );
        break;
      case 'NFL':
        this.sportsHubData.allGames = this.sortGamesByFavoriteTeam(
          this.sportsHubData.allGames,
          this.favoriteNFLTeams,
          'NFL'
        );
        break;
      case 'NCAAF':
        this.sportsHubData.allGames = this.sortGamesByFavoriteTeam(
          this.sportsHubData.allGames,
          this.selectedNCAAFTeams,
          'NCAAF'
        );
        break;
      case 'MLS':
        this.sportsHubData.allGames = this.sortGamesByFavoriteTeam(
          this.sportsHubData.allGames,
          this.favoriteMLSTeams,
          'MLS'
        );
        break;
      default:
        break;
    }

    const timeString = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true, // Use 12-hour format (AM/PM)
    });
    this.lastUpdateTime = now;
    this.sportsHubData.lastUpdated = timeString;

    this.deskthing.sendLog(`Sports Hub updated`);
    this.deskthing.sendDataToClient({
      type: 'sportshub_data',
      payload: this.sportsHubData,
    });
  }

  /**
   * Helper method to check if the league games need to be fetched
   * @param leagueDisplayName Display name used for logging
   * @param gamesKey
   * @param checkFlag
   * @returns
   */
  private checkGames(
    leagueDisplayName: string,
    gamesKey: string,
    checkFlag: boolean
  ): boolean {
    if (checkFlag) {
      if (
        !this.sportsHubData[gamesKey] ||
        this.hasLiveGame(this.sportsHubData[gamesKey])
      ) {
        if (!this.sportsHubData[gamesKey]) {
          this.deskthing.sendLog(
            `No ${leagueDisplayName} games have been retrieved. Going to fetch games.`
          );
          this.sportsHubData[gamesKey] = [];
        } else {
          this.deskthing.sendLog(
            `At least one ${leagueDisplayName} game is live. Going to fetch games.`
          );
        }
      } else {
        this.deskthing.sendLog(
          `No ${leagueDisplayName} games are live. Not fetching games.`
        );
        return false; // Set the check flag to false if no live games
      }
    } else {
      this.deskthing.sendLog(
        `${leagueDisplayName} is not set as a shown league. Not fetching games.`
      );
    }
    return checkFlag; // Return the updated check flag
  }

  private sortGamesByFavoriteTeam(
    games: Game[],
    favoriteTeams: string[],
    league: League
  ) {
    let sortedGames = games;
    if (
      this.leaguesToShow.includes(league) &&
      favoriteTeams &&
      favoriteTeams.length > 0
    ) {
      // Sort games based on whether a favorite team is involved
      sortedGames = games.sort((a, b) => {
        if (a.league !== league && b.league !== league) {
          return 0;
        }
        const aIsFavorite =
          favoriteTeams.includes(a.homeTeam.abbreviation) ||
          favoriteTeams.includes(a.awayTeam.abbreviation);
        const bIsFavorite =
          favoriteTeams.includes(b.homeTeam.abbreviation) ||
          favoriteTeams.includes(b.awayTeam.abbreviation);
        return aIsFavorite === bIsFavorite ? 0 : aIsFavorite ? -1 : 1;
      });
    }
    return sortedGames;
  }

  /**
   * Check if there is a live game in the list of games
   * @param games
   * @returns
   */
  private hasLiveGame(games: Game[]) {
    return games.some((game) => this.isGameLive(game));
  }

  private isGameLive(game: Game): boolean {
    if (game.statusType === 'in_progress') {
      return true;
    }

    if (game.statusType === 'pregame') {
      const gameTime = game.startUtc.getTime();
      const currentTime = new Date().getTime();
      return gameTime < currentTime;
    }

    return false;
  }

  // Function to fetch and parse data from the API
  private async fetchData(url: string, league: League): Promise<Game[]> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data?.service?.scoreboard) {
        throw new Error('No API data data found');
      }

      if (!data.service.scoreboard.games) {
        return [];
      }

      if (!data.service.scoreboard.teamrecord) {
        throw new Error('No Team Records found');
      }

      if (!data.service.scoreboard.teamLogo) {
        throw new Error('No Team Logos found');
      }

      // Retrieve team records and logos
      const teamRecords: { [teamId: string]: string } =
        data.service.scoreboard.teamrecord;
      const teamLogos: { [teamId: string]: string } =
        data.service.scoreboard.teamLogo;

      // Parse teams
      const teamsMap: { [id: string]: Team } = Object.fromEntries(
        await Promise.all(
          Object.values(data.service.scoreboard.teams).map(
            async (team: any) => [
              team.team_id,
              {
                id: team.team_id,
                firstName: team.first_name,
                lastName: team.last_name,
                name: team.full_name,
                abbreviation: team.abbr,
                conference: team.conference ?? 'N/A',
                division: team.division ?? 'N/A',
                record: teamRecords[team.team_id] ?? 'N/A',
                logo: await DeskThing.encodeImageFromUrl(
                  (teamLogos[team.team_id] ?? '').replace(/\\\//g, '/')
                ),
              },
            ]
          )
        )
      );

      // Parse games
      let games: Game[] = Object.values(data.service.scoreboard.games)
        .filter((game: any) => {
          // Only include soccer games where the subleague is MLS
          if (league === 'MLS') {
            return game.subleague === MLS;
          }
          // Only include NCAA Football games where one of the user's selected teams is playing
          else if (league === 'NCAAF') {
            const homeTeam = teamsMap[game.home_team_id];
            const awayTeam = teamsMap[game.away_team_id];
            return (
              this.selectedNCAAFTeams.includes(homeTeam.abbreviation) ||
              this.selectedNCAAFTeams.includes(awayTeam.abbreviation)
            );
          }

          return true;
        })
        .map((game: any) => {
          const utcDate = new Date(game.start_time);

          const options = {
            hour: 'numeric' as 'numeric',
            minute: '2-digit' as '2-digit',
            hour12: true,
            timeZoneName: 'short' as 'short', // Abbreviated time zone (e.g., CST, PST)
          };

          const localTime = utcDate.toLocaleString('en-US', options);

          return {
            gameId: game.gameid,
            league: league,
            startUtc: utcDate,
            startTime: localTime,
            homeTeam: teamsMap[game.home_team_id],
            awayTeam: teamsMap[game.away_team_id],
            homeScore: game.total_home_points,
            awayScore: game.total_away_points,
            status: game.status_display_name,
            statusType: game.status_type.replace(
              'status.type.',
              ''
            ) as GameStatusType,
            gameType: game.game_type,
            tvCoverage: game.tv_coverage ?? 'N/A',
            periods: game.game_periods.map((period: any) => ({
              periodId: period.period_id,
              name: period.display_name,
              awayPoints: period.away_points,
              homePoints: period.home_points,
            })),
            week: game.week_number,
          };
        });

      return games;
    } catch (error) {
      console.error('Error fetching or parsing data:', error);
      if (
        this.lastUpdateTime?.getDate() === new Date().getDate() &&
        this.sportsHubData[`${league.toLowerCase()}Games`]
      ) {
        this.deskthing.sendError(
          `Error fetching Sports Hub data (${league.toUpperCase()}). Using previous data: ${
            error?.message
          }`
        );
        return this.sportsHubData[`${league.toLowerCase()}Games`];
      }
      this.deskthing.sendError(
        `Error fetching Sports Hub (${league.toUpperCase()}): ${error?.message}`
      );
      return []; // Return an empty array in case of error
    }
  }

  private scheduleIntervalUpdates() {
    if (this.updateTaskId) {
      this.updateTaskId();
    }
    this.updateTaskId = DeskThing.addBackgroundTaskLoop(async () => {
      this.updateSportsHub();
      const interval = this.refreshInterval > 0 ? this.refreshInterval : 1;
      await this.sleep(interval * 60 * 1000);
    }); // Update every set amount of minutes
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public updateData(data: DataInterface) {
    if (!data.settings) {
      this.deskthing.sendLog('No settings defined');
      return;
    }
    try {
      this.deskthing.sendLog('Updating settings...');
      this.refreshInterval =
        (data.settings.refreshInterval.value as number) || 1;
      this.leaguesToShow =
        (data.settings.leaguesToShow.value as string[]) || [];
      this.favoriteLeague =
        (data.settings.favoriteLeague.value as string) || 'NONE';
      this.favoriteNBATeams =
        (data.settings.favoriteNBATeams.value as string[]) || [];
      this.favoriteNFLTeams =
        (data.settings.favoriteNFLTeams.value as string[]) || [];
      this.selectedNCAAFTeams =
        (data.settings.selectedNCAAFTeams.value as string[]) || [];
      this.favoriteMLSTeams =
        (data.settings.favoriteMLSTeams.value as string[]) || [];

      this.updateSportsHub();
    } catch (error) {
      this.deskthing.sendLog('Error updating Sports Hub data: ' + error);
    }
  }

  async stop() {
    this.lastUpdateTime = null;
  }

  public async getSportsHub(): Promise<SportsHubData> {
    // If it's been more than the set refresh interval since the last update, update the sports data
    if (
      !this.lastUpdateTime ||
      new Date().getTime() - this.lastUpdateTime.getTime() > 15 * 60 * 1000
    ) {
      DeskThing.sendLog('Fetching Sports Hub data...');
      await this.updateSportsHub();
    }
    DeskThing.sendLog('Returning Sports Hub data');
    return this.sportsHubData;
  }
}

export default SportsHubService;
