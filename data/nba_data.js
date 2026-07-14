/* Courtside Capital — Real NBA roster snapshot.
 *
 * Player entries: [name, position, age, overallRating]
 * Ratings are editorial estimates for game balance, derived from recent
 * performance — they are NOT official NBA data. Team and player names are
 * factual information.
 *
 * Refresh this file with: node scripts/update-rosters.mjs
 * (or let .github/workflows/update-rosters.yml do it weekly)
 */

const NBA_DATA = {
  asOf: '2026-01 (bundled snapshot — run scripts/update-rosters.mjs to refresh)',
  teams: [
    { name: 'Atlanta Hawks', abbr: 'ATL', players: [
      ['Trae Young', 'PG', 27, 89], ['Jalen Johnson', 'SF', 24, 85], ['Kristaps Porzingis', 'C', 30, 84],
      ['Dyson Daniels', 'SG', 23, 82], ['Onyeka Okongwu', 'C', 25, 80], ['Zaccharie Risacher', 'SF', 21, 78],
      ['Luke Kennard', 'SG', 30, 75], ['Vit Krejci', 'PG', 26, 72], ['Asa Newell', 'PF', 20, 70],
    ]},
    { name: 'Boston Celtics', abbr: 'BOS', players: [
      ['Jayson Tatum', 'SF', 28, 93], ['Jaylen Brown', 'SG', 29, 90], ['Derrick White', 'PG', 31, 85],
      ['Payton Pritchard', 'PG', 28, 82], ['Sam Hauser', 'SF', 28, 75], ['Neemias Queta', 'C', 26, 74],
      ['Baylor Scheierman', 'SG', 25, 72], ['Josh Minott', 'PF', 23, 70], ['Luka Garza', 'C', 27, 70],
    ]},
    { name: 'Brooklyn Nets', abbr: 'BKN', players: [
      ['Michael Porter Jr.', 'SF', 28, 84], ['Cam Thomas', 'SG', 24, 81], ['Nic Claxton', 'C', 27, 80],
      ['Terance Mann', 'SG', 29, 74], ['Day\'Ron Sharpe', 'C', 24, 74], ['Ziaire Williams', 'SF', 24, 73],
      ['Egor Demin', 'PG', 20, 72], ['Noah Clowney', 'PF', 21, 72], ['Drake Powell', 'SG', 20, 68],
    ]},
    { name: 'Charlotte Hornets', abbr: 'CHA', players: [
      ['LaMelo Ball', 'PG', 24, 86], ['Brandon Miller', 'SF', 23, 84], ['Miles Bridges', 'PF', 28, 80],
      ['Collin Sexton', 'PG', 27, 78], ['Kon Knueppel', 'SG', 20, 76], ['Grant Williams', 'PF', 27, 74],
      ['Tre Mann', 'PG', 25, 74], ['Moussa Diabate', 'C', 24, 72], ['Ryan Kalkbrenner', 'C', 23, 70],
    ]},
    { name: 'Chicago Bulls', abbr: 'CHI', players: [
      ['Josh Giddey', 'PG', 23, 84], ['Coby White', 'SG', 26, 82], ['Nikola Vucevic', 'C', 35, 80],
      ['Matas Buzelis', 'PF', 21, 79], ['Ayo Dosunmu', 'SG', 26, 76], ['Patrick Williams', 'PF', 24, 74],
      ['Kevin Huerter', 'SG', 27, 74], ['Tre Jones', 'PG', 26, 73], ['Jalen Smith', 'C', 26, 72],
    ]},
    { name: 'Cleveland Cavaliers', abbr: 'CLE', players: [
      ['Donovan Mitchell', 'SG', 29, 92], ['Evan Mobley', 'PF', 25, 89], ['Darius Garland', 'PG', 26, 86],
      ['Jarrett Allen', 'C', 28, 84], ['De\'Andre Hunter', 'SF', 28, 78], ['Max Strus', 'SG', 30, 76],
      ['Lonzo Ball', 'PG', 28, 75], ['Sam Merrill', 'SG', 30, 73], ['Dean Wade', 'PF', 29, 71],
    ]},
    { name: 'Dallas Mavericks', abbr: 'DAL', players: [
      ['Anthony Davis', 'PF', 33, 89], ['Kyrie Irving', 'PG', 34, 88], ['Cooper Flagg', 'SF', 19, 84],
      ['P.J. Washington', 'PF', 27, 79], ['Dereck Lively II', 'C', 22, 79], ['Daniel Gafford', 'C', 27, 78],
      ['Klay Thompson', 'SG', 36, 78], ['D\'Angelo Russell', 'PG', 30, 76], ['Naji Marshall', 'SF', 28, 74],
    ]},
    { name: 'Denver Nuggets', abbr: 'DEN', players: [
      ['Nikola Jokic', 'C', 31, 98], ['Jamal Murray', 'PG', 29, 87], ['Aaron Gordon', 'PF', 30, 82],
      ['Cameron Johnson', 'SF', 30, 80], ['Christian Braun', 'SG', 25, 78], ['Jonas Valanciunas', 'C', 34, 76],
      ['Tim Hardaway Jr.', 'SG', 34, 74], ['Peyton Watson', 'SF', 23, 74], ['Bruce Brown', 'SG', 29, 73],
    ]},
    { name: 'Detroit Pistons', abbr: 'DET', players: [
      ['Cade Cunningham', 'PG', 25, 90], ['Jalen Duren', 'C', 22, 82], ['Jaden Ivey', 'SG', 24, 79],
      ['Ausar Thompson', 'SF', 23, 79], ['Tobias Harris', 'PF', 34, 76], ['Isaiah Stewart', 'C', 25, 75],
      ['Caris LeVert', 'SG', 31, 75], ['Duncan Robinson', 'SF', 32, 74], ['Marcus Sasser', 'PG', 25, 71],
    ]},
    { name: 'Golden State Warriors', abbr: 'GSW', players: [
      ['Stephen Curry', 'PG', 38, 91], ['Jimmy Butler', 'SF', 36, 85], ['Jonathan Kuminga', 'PF', 23, 80],
      ['Draymond Green', 'PF', 36, 78], ['Brandin Podziemski', 'SG', 23, 77], ['Buddy Hield', 'SG', 33, 75],
      ['Moses Moody', 'SG', 24, 74], ['Al Horford', 'C', 40, 73], ['Quinten Post', 'C', 25, 71],
    ]},
    { name: 'Houston Rockets', abbr: 'HOU', players: [
      ['Kevin Durant', 'SF', 37, 90], ['Alperen Sengun', 'C', 24, 87], ['Amen Thompson', 'SF', 23, 84],
      ['Jabari Smith Jr.', 'PF', 23, 79], ['Fred VanVleet', 'PG', 32, 78], ['Tari Eason', 'PF', 25, 77],
      ['Reed Sheppard', 'PG', 21, 75], ['Steven Adams', 'C', 33, 75], ['Dorian Finney-Smith', 'SF', 33, 74],
    ]},
    { name: 'Indiana Pacers', abbr: 'IND', players: [
      ['Tyrese Haliburton', 'PG', 26, 90], ['Pascal Siakam', 'PF', 32, 86], ['Bennedict Mathurin', 'SG', 24, 79],
      ['Andrew Nembhard', 'PG', 26, 78], ['Aaron Nesmith', 'SF', 27, 77], ['Obi Toppin', 'PF', 28, 75],
      ['T.J. McConnell', 'PG', 34, 74], ['Jarace Walker', 'PF', 22, 74], ['Isaiah Jackson', 'C', 24, 72],
    ]},
    { name: 'LA Clippers', abbr: 'LAC', players: [
      ['Kawhi Leonard', 'SF', 35, 86], ['James Harden', 'PG', 37, 85], ['Ivica Zubac', 'C', 29, 83],
      ['Bradley Beal', 'SG', 33, 78], ['John Collins', 'PF', 28, 78], ['Bogdan Bogdanovic', 'SG', 33, 75],
      ['Derrick Jones Jr.', 'SF', 29, 74], ['Brook Lopez', 'C', 38, 74], ['Kris Dunn', 'PG', 32, 72],
    ]},
    { name: 'Los Angeles Lakers', abbr: 'LAL', players: [
      ['Luka Doncic', 'PG', 27, 96], ['LeBron James', 'SF', 41, 88], ['Austin Reaves', 'SG', 28, 84],
      ['Deandre Ayton', 'C', 27, 79], ['Rui Hachimura', 'PF', 28, 76], ['Marcus Smart', 'PG', 32, 74],
      ['Dalton Knecht', 'SG', 25, 73], ['Jarred Vanderbilt', 'PF', 26, 73], ['Gabe Vincent', 'PG', 30, 71],
    ]},
    { name: 'Memphis Grizzlies', abbr: 'MEM', players: [
      ['Ja Morant', 'PG', 26, 88], ['Jaren Jackson Jr.', 'PF', 26, 86], ['Zach Edey', 'C', 24, 78],
      ['Santi Aldama', 'PF', 25, 76], ['Ty Jerome', 'PG', 28, 76], ['Jaylen Wells', 'SG', 22, 75],
      ['Kentavious Caldwell-Pope', 'SG', 33, 74], ['Brandon Clarke', 'PF', 29, 73], ['Cedric Coward', 'SF', 22, 72],
    ]},
    { name: 'Miami Heat', abbr: 'MIA', players: [
      ['Bam Adebayo', 'C', 29, 86], ['Tyler Herro', 'SG', 26, 84], ['Norman Powell', 'SG', 33, 81],
      ['Andrew Wiggins', 'SF', 31, 78], ['Kel\'el Ware', 'C', 22, 78], ['Davion Mitchell', 'PG', 27, 74],
      ['Nikola Jovic', 'PF', 23, 74], ['Terry Rozier', 'PG', 32, 73], ['Kasparas Jakucionis', 'PG', 19, 70],
    ]},
    { name: 'Milwaukee Bucks', abbr: 'MIL', players: [
      ['Giannis Antetokounmpo', 'PF', 31, 96], ['Myles Turner', 'C', 30, 80], ['Bobby Portis', 'PF', 31, 76],
      ['Kevin Porter Jr.', 'PG', 26, 76], ['Gary Trent Jr.', 'SG', 27, 75], ['Cole Anthony', 'PG', 26, 74],
      ['Kyle Kuzma', 'PF', 30, 74], ['AJ Green', 'SG', 26, 73], ['Taurean Prince', 'SF', 32, 72],
    ]},
    { name: 'Minnesota Timberwolves', abbr: 'MIN', players: [
      ['Anthony Edwards', 'SG', 24, 93], ['Julius Randle', 'PF', 31, 82], ['Rudy Gobert', 'C', 34, 82],
      ['Jaden McDaniels', 'SF', 25, 80], ['Naz Reid', 'C', 26, 79], ['Donte DiVincenzo', 'SG', 29, 76],
      ['Rob Dillingham', 'PG', 21, 73], ['Terrence Shannon Jr.', 'SG', 25, 73], ['Mike Conley', 'PG', 38, 72],
    ]},
    { name: 'New Orleans Pelicans', abbr: 'NOP', players: [
      ['Zion Williamson', 'PF', 26, 86], ['Trey Murphy III', 'SF', 26, 81], ['Dejounte Murray', 'PG', 29, 80],
      ['Herb Jones', 'SF', 27, 78], ['Jordan Poole', 'SG', 27, 78], ['Yves Missi', 'C', 22, 75],
      ['Derik Queen', 'C', 21, 74], ['Saddiq Bey', 'SF', 27, 74], ['Jeremiah Fears', 'PG', 19, 72],
    ]},
    { name: 'New York Knicks', abbr: 'NYK', players: [
      ['Jalen Brunson', 'PG', 29, 91], ['Karl-Anthony Towns', 'C', 30, 88], ['OG Anunoby', 'SF', 28, 82],
      ['Mikal Bridges', 'SF', 29, 81], ['Josh Hart', 'SG', 31, 78], ['Mitchell Robinson', 'C', 28, 76],
      ['Miles McBride', 'PG', 25, 74], ['Guerschon Yabusele', 'PF', 30, 74], ['Jordan Clarkson', 'SG', 33, 73],
    ]},
    { name: 'Oklahoma City Thunder', abbr: 'OKC', players: [
      ['Shai Gilgeous-Alexander', 'PG', 27, 97], ['Jalen Williams', 'SF', 25, 88], ['Chet Holmgren', 'C', 24, 86],
      ['Isaiah Hartenstein', 'C', 28, 79], ['Alex Caruso', 'SG', 32, 76], ['Luguentz Dort', 'SG', 27, 76],
      ['Cason Wallace', 'PG', 22, 76], ['Aaron Wiggins', 'SG', 27, 74], ['Isaiah Joe', 'SG', 27, 73],
    ]},
    { name: 'Orlando Magic', abbr: 'ORL', players: [
      ['Paolo Banchero', 'PF', 23, 88], ['Franz Wagner', 'SF', 24, 86], ['Desmond Bane', 'SG', 27, 84],
      ['Jalen Suggs', 'PG', 25, 79], ['Wendell Carter Jr.', 'C', 27, 76], ['Anthony Black', 'PG', 22, 74],
      ['Tyus Jones', 'PG', 30, 74], ['Jonathan Isaac', 'PF', 28, 73], ['Goga Bitadze', 'C', 26, 73],
    ]},
    { name: 'Philadelphia 76ers', abbr: 'PHI', players: [
      ['Joel Embiid', 'C', 32, 90], ['Tyrese Maxey', 'PG', 25, 89], ['Paul George', 'SF', 36, 82],
      ['VJ Edgecombe', 'SG', 20, 78], ['Jared McCain', 'SG', 22, 76], ['Quentin Grimes', 'SG', 26, 76],
      ['Kelly Oubre Jr.', 'SF', 30, 74], ['Andre Drummond', 'C', 33, 72], ['Trendon Watford', 'PF', 25, 71],
    ]},
    { name: 'Phoenix Suns', abbr: 'PHX', players: [
      ['Devin Booker', 'SG', 29, 90], ['Jalen Green', 'SG', 24, 81], ['Mark Williams', 'C', 24, 77],
      ['Dillon Brooks', 'SF', 30, 76], ['Grayson Allen', 'SG', 30, 74], ['Royce O\'Neale', 'SF', 33, 73],
      ['Ryan Dunn', 'SF', 23, 73], ['Khaman Maluach', 'C', 19, 72], ['Collin Gillespie', 'PG', 26, 71],
    ]},
    { name: 'Portland Trail Blazers', abbr: 'POR', players: [
      ['Deni Avdija', 'SF', 25, 82], ['Damian Lillard', 'PG', 36, 82], ['Shaedon Sharpe', 'SG', 23, 80],
      ['Jrue Holiday', 'PG', 36, 78], ['Scoot Henderson', 'PG', 22, 77], ['Donovan Clingan', 'C', 22, 76],
      ['Toumani Camara', 'PF', 25, 76], ['Jerami Grant', 'PF', 32, 75], ['Yang Hansen', 'C', 21, 70],
    ]},
    { name: 'Sacramento Kings', abbr: 'SAC', players: [
      ['Domantas Sabonis', 'C', 30, 85], ['Zach LaVine', 'SG', 31, 83], ['DeMar DeRozan', 'SF', 36, 80],
      ['Malik Monk', 'SG', 28, 77], ['Keegan Murray', 'PF', 25, 76], ['Dennis Schroder', 'PG', 32, 74],
      ['Keon Ellis', 'SG', 26, 72], ['Nique Clifford', 'SG', 23, 71], ['Drew Eubanks', 'C', 29, 69],
    ]},
    { name: 'San Antonio Spurs', abbr: 'SAS', players: [
      ['Victor Wembanyama', 'C', 22, 94], ['De\'Aaron Fox', 'PG', 28, 87], ['Stephon Castle', 'SG', 21, 80],
      ['Dylan Harper', 'PG', 19, 78], ['Devin Vassell', 'SG', 25, 78], ['Jeremy Sochan', 'PF', 23, 75],
      ['Luke Kornet', 'C', 30, 73], ['Julian Champagnie', 'SF', 24, 72], ['Kelly Olynyk', 'C', 34, 72],
    ]},
    { name: 'Toronto Raptors', abbr: 'TOR', players: [
      ['Scottie Barnes', 'SF', 24, 85], ['Brandon Ingram', 'SF', 28, 83], ['RJ Barrett', 'SG', 26, 79],
      ['Immanuel Quickley', 'PG', 26, 78], ['Jakob Poeltl', 'C', 30, 78], ['Gradey Dick', 'SG', 22, 74],
      ['Ochai Agbaji', 'SG', 26, 72], ['Collin Murray-Boyles', 'PF', 21, 71], ['Ja\'Kobe Walter', 'SG', 21, 71],
    ]},
    { name: 'Utah Jazz', abbr: 'UTA', players: [
      ['Lauri Markkanen', 'PF', 29, 84], ['Walker Kessler', 'C', 24, 79], ['Keyonte George', 'PG', 22, 76],
      ['Ace Bailey', 'SF', 19, 75], ['Isaiah Collier', 'PG', 21, 74], ['Taylor Hendricks', 'PF', 22, 73],
      ['Kyle Filipowski', 'C', 22, 73], ['Jusuf Nurkic', 'C', 31, 73], ['Brice Sensabaugh', 'SF', 22, 72],
    ]},
    { name: 'Washington Wizards', abbr: 'WAS', players: [
      ['Alex Sarr', 'C', 21, 77], ['CJ McCollum', 'PG', 34, 76], ['Bilal Coulibaly', 'SF', 21, 74],
      ['Tre Johnson', 'SG', 19, 74], ['Cam Whitmore', 'SF', 21, 74], ['Kyshawn George', 'SF', 22, 73],
      ['Bub Carrington', 'PG', 20, 73], ['Khris Middleton', 'SF', 34, 73], ['Corey Kispert', 'SF', 27, 72],
    ]},
  ],
};
