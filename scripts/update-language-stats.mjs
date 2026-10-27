import fs from 'node:fs/promises';const username = 'dlguszoo';
const additionalRepositories = [
  'FOR-GRAD/For-Grad-Server',
  'Drink-Easy/DE_iOS',
  'DropDrugs/iOS_dd',
  'ChungBazi/ChungBazi-iOS-V2',
  'CheerLotTeam/cheerlot-ios',
  'CheerLotTeam/cheerlot-android',
  'DeveloperAcademy-POSTECH/2025-C6-A6-Bracket',
  'DevaultProject/DeVault-macOS',
];
const apiHeaders = {
  Accept: 'application/vnd.github+json',
  'User-Agent': username + '-language-stats',
  ...(process.env.GITHUB_TOKEN ? { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN } : {}),
};

async function githubJson(url) {
  const response = await fetch(url, { headers: apiHeaders });
  if (!response.ok) throw new Error(url + ': HTTP ' + response.status);
  return response.json();
}

async function discoverRepositories() {
  const repositories = new Set();
  const query = encodeURIComponent('author:' + username);

  for (let page = 1; page <= 10; page += 1) {
    const result = await githubJson('https://api.github.com/search/commits?q=' + query + '&per_page=100&page=' + page);
    const items = result.items || [];

    for (const item of items) {
      const repository = item.repository;
      if (repository?.full_name && repository.private === false) {
        repositories.add(repository.full_name);
      }
    }

    if (items.length < 100 || repositories.size >= 1000) break;
  }

  if (repositories.size === 0) {
    throw new Error('No public repositories found for ' + username);
  }

  return Array.from(new Set([...additionalRepositories, ...repositories])).sort();
}

const colors = { Swift: '#F05138', Kotlin: '#7F52FF', JavaScript: '#F1E05A', TypeScript: '#3178C6', HTML: '#E34C26', CSS: '#563D7C', Java: '#B07219', Python: '#3572A5', Ruby: '#701516', Shell: '#89E051', Dart: '#00B4AB', C: '#555555', 'C++': '#F34B7D', 'Objective-C': '#438EFF', Mustache: '#724B3B', Other: '#8B949E' };
const escapeXml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\"', '&quot;');

const repositories = await discoverRepositories();
const totals = new Map();
for (const repository of repositories) {
  const languages = await githubJson('https://api.github.com/repos/' + repository + '/languages');
  for (const [language, bytes] of Object.entries(languages)) {
    totals.set(language, (totals.get(language) || 0) + bytes);
  }
}

const entries = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
const totalBytes = entries.reduce((sum, item) => sum + item[1], 0) || 1;
const shown = entries.slice(0, 6);
const width = 600, height = 325, barX = 50, barY = 112, barWidth = 500, barHeight = 16;
const rowY = [174, 224, 274], columnX = [50, 320];
let currentX = barX;
const bar = shown.map(([language, bytes]) => { const segmentWidth = bytes / totalBytes * barWidth; const result = '<rect x="' + currentX.toFixed(2) + '" y="' + barY + '" width="' + segmentWidth.toFixed(2) + '" height="' + barHeight + '" fill="' + (colors[language] || colors.Other) + '"/>'; currentX += segmentWidth; return result; }).join('');
const labels = shown.map(([language, bytes], index) => { const column = index % 2, row = Math.floor(index / 2), x = columnX[column], y = rowY[row], percentage = bytes / totalBytes * 100; return '<g><circle cx="' + (x + 10) + '" cy="' + (y - 6) + '" r="10" fill="' + (colors[language] || colors.Other) + '"/><text x="' + (x + 30) + '" y="' + y + '" fill="#2D3748" font-family="Arial, sans-serif" font-size="20">' + escapeXml(language) + ' ' + percentage.toFixed(2) + '%</text></g>'; }).join('');
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '"><rect width="' + width + '" height="' + height + '" rx="12" fill="#F6F6F6"/><text x="50" y="70" fill="#7BA0C4" font-family="Arial, sans-serif" font-size="32" font-weight="600">Most Used Languages</text><clipPath id="bar"><rect x="' + barX + '" y="' + barY + '" width="' + barWidth + '" height="' + barHeight + '" rx="8"/></clipPath><g clip-path="url(#bar)">' + bar + '</g>' + labels + '</svg>';
await fs.mkdir('assets', { recursive: true });
await fs.writeFile('assets/most-used-languages.svg', svg);
