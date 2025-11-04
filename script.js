        let sessions = []; // Array of session objects: { date, players: [{player, starting, ending, net}] }

        // Set today's date as default
        document.getElementById('sessionDate').valueAsDate = new Date();

        // Calculate and display net amount in real-time
        document.getElementById('startingChips').addEventListener('input', calculateNet);
        document.getElementById('endingChips').addEventListener('input', calculateNet);

        function calculateNet() {
            const starting = parseInt(document.getElementById('startingChips').value) || 0;
            const ending = parseInt(document.getElementById('endingChips').value) || 0;
            const net = ending - starting;
            const netInput = document.getElementById('netAmount');
            
            netInput.value = net >= 0 ? `+${net.toLocaleString()}` : net.toLocaleString();
            netInput.className = net >= 0 ? 'positive' : 'negative';
        }

        // Load sessions from localStorage on page load
        function loadSessions() {
            const savedSessions = localStorage.getItem('pokerSessions');
            if (savedSessions) {
                sessions = JSON.parse(savedSessions);
                displayAll();
            }
        }

        // Save sessions to localStorage
        function saveSessions() {
            localStorage.setItem('pokerSessions', JSON.stringify(sessions));
        }

        // Calculate total net for each player across all sessions
        function calculateTotals() {
            const totals = {};
            sessions.forEach(session => {
                session.players.forEach(playerEntry => {
                    if (!totals[playerEntry.player]) {
                        totals[playerEntry.player] = 0;
                    }
                    totals[playerEntry.player] += playerEntry.net;
                });
            });
            return totals;
        }

        // Display current standings
        function displayStandings() {
            const standingsList = document.getElementById('standingsList');
            const totals = calculateTotals();
            
            if (Object.keys(totals).length === 0) {
                standingsList.innerHTML = '<div class="empty-state">No scores yet. Add your first session entry above.</div>';
                return;
            }

            // Sort players by total (descending)
            const sortedPlayers = Object.entries(totals)
                .sort((a, b) => b[1] - a[1]);

            standingsList.innerHTML = '';
            sortedPlayers.forEach(([player, total], index) => {
                const entryDiv = document.createElement('div');
                entryDiv.className = 'score-entry';
                
                // Determine rank badge class
                let badgeClass = '';
                if (index === 0) badgeClass = 'gold';
                else if (index === 1) badgeClass = 'silver';
                else if (index === 2) badgeClass = 'bronze';
                
                const rankDisplay = index < 3 
                    ? `<span class="rank-badge ${badgeClass}">${index + 1}</span>`
                    : `<span style="padding-left: 8px;">${index + 1}</span>`;
                
                const totalClass = total >= 0 ? 'positive' : 'negative';
                const totalDisplay = total >= 0 ? `+${total.toLocaleString()}` : total.toLocaleString();
                
                entryDiv.innerHTML = `
                    ${rankDisplay}
                    <span class="player-name">${player}</span>
                    <span class="${totalClass}">${totalDisplay}</span>
                `;
                standingsList.appendChild(entryDiv);
            });
        }

        // Display session history
        function displayHistory() {
            const historyList = document.getElementById('historyList');
            
            if (sessions.length === 0) {
                historyList.innerHTML = '<div class="empty-state">No sessions yet. Add your first session entry above.</div>';
                return;
            }

            // Sort sessions by date (newest first)
            const sortedSessions = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));

            historyList.innerHTML = '';
            sortedSessions.forEach((session, sessionIndex) => {
                const sessionCard = document.createElement('div');
                sessionCard.className = 'session-card';
                
                // Format date
                const dateObj = new Date(session.date);
                const formattedDate = dateObj.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                
                sessionCard.innerHTML = `
                    <div class="session-header">
                        <span class="session-date">${formattedDate}</span>
                    </div>
                    <div class="session-players">
                        <div class="session-players-header">Player</div>
                        <div class="session-players-header">Ending</div>
                        <div class="session-players-header">Net</div>
                        ${session.players.map(playerEntry => {
                            const netClass = playerEntry.net >= 0 ? 'positive' : 'negative';
                            const netDisplay = playerEntry.net >= 0 ? `+${playerEntry.net.toLocaleString()}` : playerEntry.net.toLocaleString();
                            return `
                                <div class="session-player-row">${playerEntry.player}</div>
                                <div class="session-player-row">${playerEntry.ending.toLocaleString()}</div>
                                <div class="session-player-row ${netClass}">${netDisplay}</div>
                            `;
                        }).join('')}
                    </div>
                `;
                historyList.appendChild(sessionCard);
            });
        }

        // Display both standings and history
        function displayAll() {
            displayStandings();
            displayHistory();
        }

        // Handle form submission
        document.getElementById('scoreForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const date = document.getElementById('sessionDate').value;
            const playerName = document.getElementById('playerName').value;
            const startingChips = parseInt(document.getElementById('startingChips').value);
            const endingChips = parseInt(document.getElementById('endingChips').value);

            if (!date || !playerName || isNaN(startingChips) || isNaN(endingChips)) {
                return;
            }

            const net = endingChips - startingChips;

            // Find or create session for this date
            let session = sessions.find(s => s.date === date);
            
            if (!session) {
                session = { date, players: [] };
                sessions.push(session);
            }

            // Check if player already has an entry for this session
            const existingPlayerIndex = session.players.findIndex(p => p.player === playerName);
            
            if (existingPlayerIndex >= 0) {
                // Update existing entry
                session.players[existingPlayerIndex] = {
                    player: playerName,
                    starting: startingChips,
                    ending: endingChips,
                    net: net
                };
            } else {
                // Add new player entry
                session.players.push({
                    player: playerName,
                    starting: startingChips,
                    ending: endingChips,
                    net: net
                });
            }
            
            saveSessions();
            displayAll();
            
            // Clear form
            document.getElementById('playerName').value = '';
            document.getElementById('startingChips').value = '';
            document.getElementById('endingChips').value = '';
            document.getElementById('netAmount').value = '';
            document.getElementById('playerName').focus();
        });

        // Handle clear all data button
        document.getElementById('clearAllData').addEventListener('click', function() {
            if (confirm('Are you sure you want to delete all session data? This cannot be undone.')) {
                sessions = [];
                localStorage.removeItem('pokerSessions');
                displayAll();
            }
        });

        // Load sessions when page loads
        loadSessions();
