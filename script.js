        let sessions = []; // Array of session objects: { id, date, players: [{player, starting, ending, net}] }

        // Get the next unique ID for a session
        function getNextSessionId() {
            // Only consider sessions that have numeric IDs
            const sessionsWithIds = sessions.filter(s => s.id != null && typeof s.id === 'number');
            if (sessionsWithIds.length === 0) {
                return 1;
            }
            const maxId = Math.max(...sessionsWithIds.map(s => s.id));
            return maxId + 1;
        }

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

        // Load sessions from poker-sessions.json on page load
        async function loadSessions() {
            try {
                const response = await fetch(`/poker-sessions.json?ts=${Date.now()}`, {
                    cache: 'no-store'
                });
                
                if (!response.ok) {
                    if (response.status === 404) {
                        sessions = [];
                        displayAll();
                        return;
                    }
                    throw new Error(`Failed to load sessions (status ${response.status})`);
                }
                
                const data = await response.json();
                sessions = Array.isArray(data) ? data : [];
            } catch (error) {
                console.error('Error loading sessions from file:', error);
                sessions = [];
            }
            
            displayAll();
        }

        // Normalize session object property order (id first, then date, then players)
        // This only reorders properties, it does NOT modify any values or IDs
        function normalizeSession(session) {
            // Create new object with properties in correct order
            // Preserve all existing values exactly as they are
            const normalized = {};
            if (session.id !== undefined) normalized.id = session.id;
            if (session.date !== undefined) normalized.date = session.date;
            if (session.players !== undefined) normalized.players = session.players;
            // Preserve any other properties that might exist
            Object.keys(session).forEach(key => {
                if (!['id', 'date', 'players'].includes(key)) {
                    normalized[key] = session[key];
                }
            });
            return normalized;
        }

        // Save sessions data to poker-sessions.json via server
        async function saveSessions() {
            try {
                // Normalize all sessions before saving to ensure consistent property order
                const normalizedSessions = sessions.map(normalizeSession);
                const response = await fetch('/api/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(normalizedSessions)
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

        function sortSessionsByDateDesc(list) {
            return [...list].sort((a, b) => {
                const isAYearOnly2024 = a.date === '2024';
                const isBYearOnly2024 = b.date === '2024';

                if (isAYearOnly2024 && !isBYearOnly2024) {
                    return 1;
                }
                if (!isAYearOnly2024 && isBYearOnly2024) {
                    return -1;
                }
                if (isAYearOnly2024 && isBYearOnly2024) {
                    return 0;
                }

                const isAYear = /^\d{4}$/.test(a.date);
                const isBYear = /^\d{4}$/.test(b.date);

                if (isAYear && isBYear) {
                    return parseInt(b.date) - parseInt(a.date);
                } else if (isAYear) {
                    const aYear = parseInt(a.date);
                    const bYear = new Date(b.date).getFullYear();
                    if (aYear !== bYear) {
                        return bYear - aYear;
                    }
                    return -1;
                } else if (isBYear) {
                    const aYear = new Date(a.date).getFullYear();
                    const bYear = parseInt(b.date);
                    if (aYear !== bYear) {
                        return bYear - aYear;
                    }
                    return 1;
                } else {
                    return new Date(b.date) - new Date(a.date);
                }
            });
        }

        function calculateCurrentStreaks() {
            const streaks = {};
            const sortedSessions = sortSessionsByDateDesc(sessions);
            const players = new Set();

            sessions.forEach(session => {
                session.players.forEach(playerEntry => players.add(playerEntry.player));
            });

            players.forEach(player => {
                let streakType = null;
                let count = 0;

                for (const session of sortedSessions) {
                    const entry = session.players.find(p => p.player === player);
                    if (!entry) {
                        continue;
                    }

                    const result = entry.net > 0 ? 'win' : entry.net < 0 ? 'loss' : 'neutral';
                    if (result === 'neutral') {
                        break;
                    }
                    if (streakType === null) {
                        streakType = result;
                        count = 1;
                        continue;
                    }
                    if (result === streakType) {
                        count += 1;
                    } else {
                        break;
                    }
                }

                streaks[player] = {
                    win: streakType === 'win' ? count : 0,
                    loss: streakType === 'loss' ? count : 0
                };
            });

            return streaks;
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
            const streaks = calculateCurrentStreaks();
            
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
                const playerStreak = streaks[player] || { win: 0, loss: 0 };
                
                entryDiv.innerHTML = `
                    ${rankDisplay}
                    <span class="player-name">${player}</span>
                    <span class="${totalClass}">${totalDisplay}</span>
                    <span class="chip-amount">${playerTotalChips.toLocaleString()}</span>
                    <span class="positive">${playerStreak.win ? playerStreak.win : '-'}</span>
                    <span class="negative">${playerStreak.loss ? playerStreak.loss : '-'}</span>
                `;
                standingsList.appendChild(entryDiv);
            });
            
            // Update player button colors based on new standings
            updatePlayerButtonColors();
        }

        function getSessionYear(dateStr) {
            if (/^\d{4}$/.test(dateStr)) {
                return dateStr;
            }
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                return dateStr.slice(0, 4);
            }
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) {
                return String(parsed.getFullYear());
            }
            return null;
        }

        function calculateYearlyTotals() {
            const totals = {};
            sessions.forEach(session => {
                const year = getSessionYear(session.date);
                if (!year) {
                    return;
                }
                if (!totals[year]) {
                    totals[year] = {};
                }
                session.players.forEach(playerEntry => {
                    if (!totals[year][playerEntry.player]) {
                        totals[year][playerEntry.player] = 0;
                    }
                    totals[year][playerEntry.player] += playerEntry.net;
                });
            });
            return totals;
        }

        function displayYearlyTally() {
            const yearlyTally = document.getElementById('yearlyTally');
            const yearlyTotals = calculateYearlyTotals();
            const years = Object.keys(yearlyTotals).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));

            if (years.length === 0) {
                yearlyTally.innerHTML = '<div class="empty-state">No yearly totals yet.</div>';
                return;
            }

            yearlyTally.innerHTML = '';
            years.forEach(year => {
                const yearCard = document.createElement('div');
                yearCard.className = 'yearly-card';

                const sortedPlayers = Object.entries(yearlyTotals[year])
                    .sort((a, b) => b[1] - a[1]);

                yearCard.innerHTML = `
                    <div class="yearly-header">${year}</div>
                    <div class="yearly-rows">
                        <div class="yearly-rows-header">Player</div>
                        <div class="yearly-rows-header">Net</div>
                        ${sortedPlayers.map(([player, total]) => {
                            const totalClass = total >= 0 ? 'positive' : 'negative';
                            const totalDisplay = total >= 0 ? `+${total.toLocaleString()}` : total.toLocaleString();
                            return `
                                <div class="yearly-row">${player}</div>
                                <div class="yearly-row ${totalClass}">${totalDisplay}</div>
                            `;
                        }).join('')}
                    </div>
                `;
                yearlyTally.appendChild(yearCard);
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
            //Stop trying to sort by id. Sorting by date is fine.
            const sortedSessions = sortSessionsByDateDesc(sessions);

            historyList.innerHTML = '';
            sortedSessions.forEach((session, sessionIndex) => {
                const sessionCard = document.createElement('div');
                sessionCard.className = 'session-card';
                
                // Format date - if it's just a year (4 digits), display as just the year
                let formattedDate;
                if (/^\d{4}$/.test(session.date)) {
                    // Date is just a year like "2024"
                    formattedDate = session.date;
                } else {
                    // Date is in YYYY-MM-DD format or other format
                    const dateObj = new Date(session.date);
                    if (!isNaN(dateObj.getTime())) {
                        formattedDate = dateObj.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        });
                    } else {
                        // Fallback: use the raw date string
                        formattedDate = session.date;
                    }
                }
                
                // Sort players by ending chips (highest first)
                const sortedPlayers = [...session.players].sort((a, b) => b.ending - a.ending);
                
                sessionCard.innerHTML = `
                    <div class="session-header">
                        <span class="session-date">${formattedDate}</span>
                        <button class="delete-session-btn" data-date="${session.date}" title="Delete this session">×</button>
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
            displayYearlyTally();
            displayHistory();
        }

        // Handle delete session button clicks (using event delegation)
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('delete-session-btn')) {
                const dateToDelete = e.target.getAttribute('data-date');
                
                // Format date for confirmation message
                let dateDisplay;
                if (/^\d{4}$/.test(dateToDelete)) {
                    dateDisplay = dateToDelete;
                } else {
                    const dateObj = new Date(dateToDelete);
                    if (!isNaN(dateObj.getTime())) {
                        dateDisplay = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                    } else {
                        dateDisplay = dateToDelete;
                    }
                }
                if (confirm(`Are you sure you want to delete the session from ${dateDisplay}?`)) {
                    // Remove session from array
                    sessions = sessions.filter(s => s.date !== dateToDelete);
                    
                    // Save and refresh
                saveSessions();
                    displayAll();
                }
            }
        });

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
                session = { 
                    id: getNextSessionId(), 
                    date, 
                    players: [] 
                };
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
            document.getElementById('endingChips').value = '';
            document.getElementById('netAmount').value = '';
            // Clear selected button
            document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('selected'));
        });

        // Handle clear all data button
        // document.getElementById('clearAllData').addEventListener('click', function() {
        //     if (confirm('Are you sure you want to delete all session data? This cannot be undone.')) {
        //         sessions = [];
        //         saveSessions();
        //         displayAll();
        //     }
        // });

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
        //                 let finalDateStr;  // This will hold the final date string to store
        //                 try {
        //                     const dateStr = entry.date.trim();
                            
        //                     // If date is just a year like "2024", store it as just the year
        //                     const yearMatch = dateStr.match(/^(\d{4})$/);
        //                     if (yearMatch) {
        //                         const year = parseInt(yearMatch[1]);
        //                         if (year >= 1900 && year <= 2100) {
        //                             finalDateStr = year.toString(); // Store as just "2024"
        //                         } else {
        //                             throw new Error(`Invalid year: ${year}. Year must be between 1900 and 2100`);
        //                         }
        //                     } else {
        //                         // For other date formats, parse and convert to YYYY-MM-DD
        //                         let dateObj;
                                
        //                         // Try to parse the date string directly first
        //                         dateObj = new Date(dateStr);
        //                         if (isNaN(dateObj.getTime())) {
        //                             // If direct parsing fails, try different formats
                                    
        //                             // Format: "Tuesday October 28, 2025" or "October 28, 2025"
        //                             let dateMatch = dateStr.match(/(\w+)\s+(\w+)\s+(\d+),\s+(\d+)/);
        //                             if (dateMatch) {
        //                                 const [, , monthName, day, year] = dateMatch;
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
                                    
        //                             // If still no match, try format: "October 28, 2025" (without day name)
        //                             if (!dateObj || isNaN(dateObj.getTime())) {
        //                                 dateMatch = dateStr.match(/(\w+)\s+(\d+),\s+(\d+)/);
        //                                 if (dateMatch) {
        //                                     const [, monthName, day, year] = dateMatch;
        //                                     const months = {
        //                                         'January': 0, 'February': 1, 'March': 2, 'April': 3,
        //                                         'May': 4, 'June': 5, 'July': 6, 'August': 7,
        //                                         'September': 8, 'October': 9, 'November': 10, 'December': 11
        //                                     };
        //                                     const month = months[monthName];
        //                                     if (month !== undefined) {
        //                                         dateObj = new Date(year, month, day);
        //                                     }
        //                                 }
        //                             }
                                    
        //                             // If still can't parse, throw error
        //                             if (!dateObj || isNaN(dateObj.getTime())) {
        //                                 throw new Error(`Could not parse date: "${entry.date}". Expected format like "October 28, 2025" or "Tuesday October 28, 2025"`);
        //                             }
        //                         }
                                
        //                         // Format date as YYYY-MM-DD
        //                         const year = dateObj.getFullYear();
        //                         const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        //                         const day = String(dateObj.getDate()).padStart(2, '0');
        //                         finalDateStr = `${year}-${month}-${day}`;
        //                     }
        //                 } catch (err) {
        //                     throw new Error(`Date parsing error: ${err.message}`);
        //                 }
                        
        //                 // Find or create session for this date
        //                 let session = sessions.find(s => s.date === finalDateStr);
        //                 if (!session) {
        //                     session = { 
        //                         id: getNextSessionId(), 
        //                         date: finalDateStr, 
        //                         players: [] 
        //                     };
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
        //             }, 3001);
                    
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
