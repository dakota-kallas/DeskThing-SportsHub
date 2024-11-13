import { DeskThing } from './index';
import { DataInterface } from 'deskthing-server';
import {
  Game,
  GameStatusType,
  Player,
  SportsHubData,
  Team,
} from '../src/stores/sportsHubStore';

class SportsHubService {
  private sportsHubData: SportsHubData;
  private lastUpdateTime: Date | null;
  private updateTaskId: (() => void) | null = null;
  private deskthing: typeof DeskThing;
  private static instance: SportsHubService | null = null;
  private refreshInterval: number = 1;
  private favoriteNBATeams: string[] = [];

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
    this.deskthing.sendLog(`Fetching Sports Hub data from API.`);
    this.sportsHubData = {} as SportsHubData;

    const now = new Date();
    const localYear = now.getFullYear();
    const localMonth = String(now.getMonth() + 1).padStart(2, '0');
    const localDay = String(now.getDate()).padStart(2, '0');
    const localDate = `${localYear}-${localMonth}-${localDay}`;

    const teamUrl =
      'https://sports.yahoo.com/site/api/resource/sports.league.positionsteams;league=nba?lang=en-US&region=US';

    const url = `https://api-secure.sports.yahoo.com/v1/editorial/s/scoreboard?lang=en-US&region=US&ysp_redesign=1&ysp_platform=desktop&leagues=nba&date=${localDate}&v=2&ysp_enable_last_update=1`;
    const games = await this.fetchNBAData(url);
    this.sportsHubData.games = games;

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

  // Function to fetch and parse data from the API
  private async fetchNBAData(url: string): Promise<Game[]> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }

      const data = await response.json();

      // Retrieve team records and logos
      const teamRecords: { [teamId: string]: string } =
        data.service.scoreboard.teamrecord;
      const teamLogos: { [teamId: string]: string } =
        data.service.scoreboard.teamLogo;

      // Parse NBA teams
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
                conference: team.conference,
                division: team.division,
                record: teamRecords[team.team_id] ?? 'N/A',
                logo: await DeskThing.encodeImageFromUrl(
                  (teamLogos[team.team_id] ?? '').replace(/\\\//g, '/')
                ),
              },
            ]
          )
        )
      );

      // Parse NBA players
      const playersMap: { [id: string]: Player } = Object.fromEntries(
        Object.values(data.service.scoreboard.players).map((player: any) => [
          player.player_id,
          {
            id: player.player_id,
            firstName: player.first_name,
            lastName: player.last_name,
            teamId: player.team_id,
            uniformNumber: player.uniform_number,
          },
        ])
      );

      // Define the sorting order based on status type priority
      const statusOrder: { [key in GameStatusType]: number } = {
        [GameStatusType.Pregame]: 2,
        [GameStatusType.Live]: 1,
        [GameStatusType.Final]: 3,
        [GameStatusType.Postponed]: 4,
      };

      // Parse NBA games
      let games: Game[] = Object.values(data.service.scoreboard.games)
        .map((game: any) => ({
          gameId: game.gameid,
          startTime: game.start_time,
          homeTeam: teamsMap[game.home_team_id],
          awayTeam: teamsMap[game.away_team_id],
          homeScore: game.total_home_points,
          awayScore: game.total_away_points,
          status: game.status_display_name,
          statusType: game.status_type,
          gameType: game.game_type,
          tvCoverage: game.tv_coverage,
          periods: game.game_periods.map((period: any) => ({
            periodId: period.period_id,
            name: period.display_name,
            awayPoints: period.away_points,
            homePoints: period.home_points,
          })),
        }))
        .sort((a, b) => statusOrder[a.statusType] - statusOrder[b.statusType]);

      if (this.favoriteNBATeams.length > 0) {
        // Sort games based on whether a favorite team is involved
        games = games.sort((a, b) => {
          const aIsFavorite =
            this.favoriteNBATeams.includes(a.homeTeam.abbreviation) ||
            this.favoriteNBATeams.includes(a.awayTeam.abbreviation);
          const bIsFavorite =
            this.favoriteNBATeams.includes(b.homeTeam.abbreviation) ||
            this.favoriteNBATeams.includes(b.awayTeam.abbreviation);
          return aIsFavorite === bIsFavorite ? 0 : aIsFavorite ? -1 : 1;
        });
      }

      return games;
    } catch (error) {
      this.deskthing.sendError('Error fetching Sports Hub Data!');
      console.error('Error fetching or parsing data:', error);
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
      this.deskthing.sendLog('Updating settings');
      this.refreshInterval =
        (data.settings.refreshInterval.value as number) || 1;
      this.favoriteNBATeams =
        (data.settings.favoriteNBATeams.value as string[]) || [];
      this.updateSportsHub();
    } catch (error) {
      this.deskthing.sendLog('Error updating Sports Hub data: ' + error);
    }
  }

  async stop() {
    this.lastUpdateTime = null;
  }

  public async getSportsHub(): Promise<SportsHubData> {
    // If it's been more than an hour since the last update, update the sports data
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
