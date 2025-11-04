        let sessions = []; // Array of session objects: { date, players: [{player, starting, ending, net}] }

        // Set today's date as default
        document.getElementById('sessionDate').valueAsDate = new Date();

        // Set up player button click handlers
        document.querySelectorAll('.player-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                // Remove selected class from all buttons
                document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('selected'));
                // Add selected class to clicked button
                this.classList.add('selected');
                // Set the hidden input value
                document.getElementById('playerName').value = this.getAttribute('data-player');
                // Return focus to ending chips field
                const endingChipsInput = document.getElementById('endingChips');
                if (endingChipsInput) {
                    endingChipsInput.focus();
                }
            });
        });

        // Calculate and display net amount in real-time
        const STARTING_CHIPS = 500;
        document.getElementById('endingChips').addEventListener('input', calculateNet);

        function calculateNet() {
            const ending = parseInt(document.getElementById('endingChips').value) || 0;
            const net = ending - STARTING_CHIPS;
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

        // Save sessions data to poker-sessions.json via server
        async function exportSessionsToJSON() {
            try {
                const response = await fetch('/api/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(sessions)
                });
                
                const result = await response.json();
                if (result.success) {
                    console.log('Data saved to poker-sessions.json');
                } else {
                    console.error('Error saving data:', result.error);
                }
            } catch (error) {
                console.error('Error saving data to file:', error);
            }
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

        // Calculate total chips for each player (sum of all ending chips)
        function calculateTotalChips() {
            const totalChips = {};
            sessions.forEach(session => {
                session.players.forEach(playerEntry => {
                    if (!totalChips[playerEntry.player]) {
                        totalChips[playerEntry.player] = 0;
                    }
                    totalChips[playerEntry.player] += playerEntry.ending;
                });
            });
            return totalChips;
        }

        // Update player button colors based on current standings
        function updatePlayerButtonColors() {
            const totals = calculateTotals();
            
            // Map player names to button IDs
            const playerToButtonId = {
                'Papa': 'playerBtn1',
                'Uncle B': 'playerBtn2',
                'Elliott': 'playerBtn3',
                'Emmett': 'playerBtn4'
            };
            
            // Remove all rank classes from buttons first
            document.querySelectorAll('.player-btn').forEach(btn => {
                btn.classList.remove('rank-1', 'rank-2', 'rank-3', 'rank-4');
            });
            
            // Sort players by total (descending) to get ranks
            const sortedPlayers = Object.entries(totals)
                .sort((a, b) => b[1] - a[1])
                .map(([player]) => player);
            
            // Apply rank classes based on standings
            sortedPlayers.forEach((player, index) => {
                const rank = index + 1;
                const btnId = playerToButtonId[player];
                if (btnId) {
                    const btn = document.getElementById(btnId);
                    if (btn) {
                        btn.classList.add(`rank-${Math.min(rank, 4)}`); // Cap at rank 4
                    }
                }
            });
            
            // Players with no entries get rank-4 (default)
            const allPlayers = ['Papa', 'Uncle B', 'Elliott', 'Emmett'];
            allPlayers.forEach(player => {
                if (!sortedPlayers.includes(player)) {
                    const btnId = playerToButtonId[player];
                    if (btnId) {
                        const btn = document.getElementById(btnId);
                        if (btn) {
                            btn.classList.add('rank-4');
                        }
                    }
                }
            });
        }

        // Display current standings
        function displayStandings() {
            const standingsList = document.getElementById('standingsList');
            const totals = calculateTotals();
            const totalChips = calculateTotalChips();
            
            if (Object.keys(totals).length === 0) {
                standingsList.innerHTML = '<div class="empty-state">No scores yet. Add your first session entry above.</div>';
                // Still update button colors (all will be rank-4)
                updatePlayerButtonColors();
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
                
                const playerTotalChips = totalChips[player] || 0;
                
                entryDiv.innerHTML = `
                    ${rankDisplay}
                    <span class="player-name">${player}</span>
                    <span class="${totalClass}">${totalDisplay}</span>
                    <span class="chip-amount">${playerTotalChips.toLocaleString()}</span>
                `;
                standingsList.appendChild(entryDiv);
            });
            
            // Update player button colors based on new standings
            updatePlayerButtonColors();
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
                
                // Sort players by ending chips (highest first)
                const sortedPlayers = [...session.players].sort((a, b) => b.ending - a.ending);
                
                sessionCard.innerHTML = `
                    <div class="session-header">
                        <span class="session-date">${formattedDate}</span>
                    </div>
                    <div class="session-players">
                        <div class="session-players-header">Player</div>
                        <div class="session-players-header">Ending</div>
                        <div class="session-players-header">Net</div>
                        ${sortedPlayers.map(playerEntry => {
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
            const startingChips = STARTING_CHIPS;
            const endingChips = parseInt(document.getElementById('endingChips').value);

            if (!date || !playerName || isNaN(endingChips)) {
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
            
            // Export data to poker-sessions.json file
            exportSessionsToJSON();
            
            // Clear form
            document.getElementById('playerName').value = '';
            document.getElementById('endingChips').value = '';
            document.getElementById('netAmount').value = '';
            // Clear selected button
            document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('selected'));
        });

        // Handle clear all data button
        document.getElementById('clearAllData').addEventListener('click', function() {
            if (confirm('Are you sure you want to delete all session data? This cannot be undone.')) {
                sessions = [];
                localStorage.removeItem('pokerSessions');
                displayAll();
            }
        });

        // Handle JSON import
        // document.getElementById('importJsonBtn').addEventListener('click', function() {
        //     const fileInput = document.getElementById('jsonFileInput');
        //     const file = fileInput.files[0];
        //     const statusDiv = document.getElementById('importStatus');
            
        //     if (!file) {
        //         statusDiv.textContent = 'Please select a JSON file';
        //         statusDiv.className = 'import-status error';
        //         return;
        //     }
            
        //     const reader = new FileReader();
        //     reader.onload = function(e) {
        //         try {
        //             const jsonData = JSON.parse(e.target.result);
        //             const importData = Array.isArray(jsonData) ? jsonData : [jsonData];
                    
        //             let importedCount = 0;
        //             const playerNames = ['Papa', 'Uncle B', 'Elliott', 'Emmett'];
                    
        //             importData.forEach(entry => {
        //                 if (!entry.date || !entry.score || !Array.isArray(entry.score)) {
        //                     throw new Error('Invalid JSON format. Expected {date: string, score: number[]}');
        //                 }
                        
        //                 // Parse date from various formats
        //                 let dateObj;
        //                 try {
        //                     const dateStr = entry.date.trim();
                            
        //                     // Try to parse the date string directly first
        //                     dateObj = new Date(dateStr);
        //                     if (isNaN(dateObj.getTime())) {
        //                         // If direct parsing fails, try different formats
                                
        //                         // Format: "Tuesday October 28, 2025" or "October 28, 2025"
        //                         let dateMatch = dateStr.match(/(\w+)\s+(\w+)\s+(\d+),\s+(\d+)/);
        //                         if (dateMatch) {
        //                             const [, , monthName, day, year] = dateMatch;
        //                             const months = {
        //                                 'January': 0, 'February': 1, 'March': 2, 'April': 3,
        //                                 'May': 4, 'June': 5, 'July': 6, 'August': 7,
        //                                 'September': 8, 'October': 9, 'November': 10, 'December': 11
        //                             };
        //                             const month = months[monthName];
        //                             if (month !== undefined) {
        //                                 dateObj = new Date(year, month, day);
        //                             }
        //                         }
                                
        //                         // If still no match, try format: "October 28, 2025" (without day name)
        //                         if (!dateObj || isNaN(dateObj.getTime())) {
        //                             dateMatch = dateStr.match(/(\w+)\s+(\d+),\s+(\d+)/);
        //                             if (dateMatch) {
        //                                 const [, monthName, day, year] = dateMatch;
        //                                 const months = {
        //                                     'January': 0, 'February': 1, 'March': 2, 'April': 3,
        //                                     'May': 4, 'June': 5, 'July': 6, 'August': 7,
        //                                     'September': 8, 'October': 9, 'November': 10, 'December': 11
        //                                 };
        //                                 const month = months[monthName];
        //                                 if (month !== undefined) {
        //                                     dateObj = new Date(year, month, day);
        //                                 }
        //                             }
        //                         }
                                
        //                         // If date is just a year like "2024", default to January 1st of that year
        //                         if (!dateObj || isNaN(dateObj.getTime())) {
        //                             const yearMatch = dateStr.match(/^(\d{4})$/);
        //                             if (yearMatch) {
        //                                 const year = parseInt(yearMatch[1]);
        //                                 if (year >= 1900 && year <= 2100) {
        //                                     dateObj = new Date(year, 0, 1); // January 1st
        //                                 }
        //                             }
        //                         }
                                
        //                         // If still can't parse, throw error
        //                         if (!dateObj || isNaN(dateObj.getTime())) {
        //                             throw new Error(`Could not parse date: "${entry.date}". Expected format like "October 28, 2025" or "Tuesday October 28, 2025"`);
        //                         }
        //                     }
        //                 } catch (err) {
        //                     throw new Error(`Date parsing error: ${err.message}`);
        //                 }
                        
        //                 // Format date as YYYY-MM-DD
        //                 const year = dateObj.getFullYear();
        //                 const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        //                 const day = String(dateObj.getDate()).padStart(2, '0');
        //                 const dateStr = `${year}-${month}-${day}`;
                        
        //                 // Find or create session for this date
        //                 let session = sessions.find(s => s.date === dateStr);
        //                 if (!session) {
        //                     session = { date: dateStr, players: [] };
        //                     sessions.push(session);
        //                 }
                        
        //                 // Add player entries for this session
        //                 entry.score.forEach((endingChips, index) => {
        //                     if (index < playerNames.length) {
        //                         const playerName = playerNames[index];
        //                         const net = endingChips - STARTING_CHIPS;
                                
        //                         // Check if player already has an entry for this session
        //                         const existingIndex = session.players.findIndex(p => p.player === playerName);
        //                         if (existingIndex >= 0) {
        //                             // Update existing entry
        //                             session.players[existingIndex] = {
        //                                 player: playerName,
        //                                 starting: STARTING_CHIPS,
        //                                 ending: endingChips,
        //                                 net: net
        //                             };
        //                         } else {
        //                             // Add new entry
        //                             session.players.push({
        //                                 player: playerName,
        //                                 starting: STARTING_CHIPS,
        //                                 ending: endingChips,
        //                                 net: net
        //                             });
        //                         }
        //                     }
        //                 });
                        
        //                 importedCount++;
        //             });
                    
        //             // Save and refresh
        //             saveSessions();
        //             displayAll();
                    
        //             // Show success message
        //             statusDiv.textContent = `Successfully imported ${importedCount} session(s)!`;
        //             statusDiv.className = 'import-status success';
                    
        //             // Clear file input
        //             fileInput.value = '';
                    
        //             // Clear status after 3 seconds
        //             setTimeout(() => {
        //                 statusDiv.textContent = '';
        //                 statusDiv.className = 'import-status';
        //             }, 3000);
                    
        //         } catch (error) {
        //             statusDiv.textContent = `Error importing data: ${error.message}`;
        //             statusDiv.className = 'import-status error';
        //         }
        //     };
            
        //     reader.onerror = function() {
        //         statusDiv.textContent = 'Error reading file';
        //         statusDiv.className = 'import-status error';
        //     };
            
        //     reader.readAsText(file);
        // });

        // Load sessions when page loads
        loadSessions();
