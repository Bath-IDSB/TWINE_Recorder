
 (function() {
    // TWINE Response Recorder - Open Access Version
    // Configuration object - customize these values for your study
    const config = {
        // Study identification
        condition: window.TWINE_CONFIG?.condition || 'default',
        participant_id: window.TWINE_CONFIG?.participant_id || generateParticipantId(),
        
        // Data storage options
        storage_method: window.TWINE_CONFIG?.storage_method || 'localStorage', // 'localStorage', 'server', 'download'
        server_endpoint: window.TWINE_CONFIG?.server_endpoint || '/api/twine-data',
        
        // Completion behavior
        completion_action: window.TWINE_CONFIG?.completion_action || 'none', // 'none', 'redirect', 'callback'
        redirect_url: window.TWINE_CONFIG?.redirect_url || '',
        completion_callback: window.TWINE_CONFIG?.completion_callback || null,
        
        // Debug mode
        debug: window.TWINE_CONFIG?.debug || false
    };

    // Initialize history arrays
    let click_history = []
    let focus_history = []
    
    // Generate a simple participant ID if none provided
    function generateParticipantId() {
        return 'participant_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Logging function
    function log(...args) {
        if (config.debug) {
            console.log('[TWINE Recorder]', ...args);
        }
    }
    
    log('Initialized with config:', config);
    //Listen to focus changes
    document.addEventListener('visibilitychange', function() {
        const timestamp = Date.now();
        const isVisible = !document.hidden;
        
        // Log the visibility change
        // Add to view history with special type
        focus_history.push({
            timestamp: timestamp,
            type: 'tabVisibility',
            isVisible: isVisible
        });

        log('Focus history updated:', focus_history);
    });

    // Data storage functions
    function saveDataToLocalStorage(data) {
        try {
            localStorage.setItem('twine_data_' + config.participant_id, JSON.stringify(data));
            log('Data saved to localStorage');
            return true;
        } catch (error) {
            log('Error saving to localStorage:', error);
            return false;
        }
    }
    
    function downloadData(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `twine_data_${config.participant_id}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        log('Data downloaded');
    }
    
    function saveDataToServer(data) {
        return fetch(config.server_endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(result => {
            log('Data saved to server:', result);
            return result;
        })
        .catch(error => {
            log('Error saving to server:', error);
            throw error;
        });
    }
    
    function handleCompletion() {
        const data = {
            participant_id: config.participant_id,
            condition: config.condition,
            click_history: click_history,
            focus_history: focus_history,
            timestamp: new Date().toISOString(),
            session_duration: Date.now() - session_start_time
        };
        
        log('Story completed, handling data:', data);
        
        // Save data based on configuration
        switch (config.storage_method) {
            case 'localStorage':
                saveDataToLocalStorage(data);
                handleCompletionAction();
                break;
            case 'download':
                downloadData(data);
                handleCompletionAction();
                break;
            case 'server':
                saveDataToServer(data)
                    .then(() => handleCompletionAction())
                    .catch(error => {
                        log('Server save failed, falling back to localStorage');
                        saveDataToLocalStorage(data);
                        handleCompletionAction();
                    });
                break;
            default:
                log('No storage method specified, data not saved');
                handleCompletionAction();
        }
    }
    
    function handleCompletionAction() {
        switch (config.completion_action) {
            case 'redirect':
                if (config.redirect_url) {
                    const url = config.redirect_url.replace('{participant_id}', config.participant_id);
                    window.location.href = url;
                }
                break;
            case 'callback':
                if (typeof config.completion_callback === 'function') {
                    config.completion_callback({
                        participant_id: config.participant_id,
                        condition: config.condition,
                        click_count: click_history.length,
                        focus_changes: focus_history.length
                    });
                }
                break;
            default:
                log('Story completed, no further action specified');
        }
    }
    
    // Track session start time
    const session_start_time = Date.now();

    // Create an observer instance
    const observer = new MutationObserver((mutations) => {
        log("New passage detected");
        // Find all link-goto elements
        const linkElements = document.querySelectorAll('tw-expression[type="macro"][name="link-goto"] tw-link');
        log('Found link elements:', linkElements.length);
        
        if (linkElements.length == 0 && click_history.length > 0) {
            log("No more links found and have click history - story completed");
            handleCompletion();
            return;
        }

        // Add click listener to each link
        linkElements.forEach(link => {
            // Log initial link found
            log('Found link:', {
                text: link.textContent,
                raw: link.getAttribute('data-raw')
            });
            
          
                link.addEventListener('click', (event) => {
                // Create click record
                const clickRecord = {
                    text: link.textContent,
                    raw: link.getAttribute('data-raw'),
                    timestamp: new Date().toISOString()
                };
                

                // Add to history
                click_history.push(clickRecord);
                
                // Log for debugging
                log('Click recorded:', clickRecord);
                log('Total clicks so far:', click_history.length);
            });
        });
    });

    // Start observing the document with the configured parameters
    observer.observe(document.body, {
        childList: true,
        subtree: false,
        characterData: false
    });

    // Expose API for external access
    window.TWINE_RECORDER = {
        getClickHistory: () => [...click_history],
        getFocusHistory: () => [...focus_history],
        getParticipantId: () => config.participant_id,
        getCondition: () => config.condition,
        exportData: () => {
            return {
                participant_id: config.participant_id,
                condition: config.condition,
                click_history: [...click_history],
                focus_history: [...focus_history],
                timestamp: new Date().toISOString(),
                session_duration: Date.now() - session_start_time
            };
        },
        saveData: (method = config.storage_method) => {
            const data = window.TWINE_RECORDER.exportData();
            switch (method) {
                case 'localStorage':
                    return saveDataToLocalStorage(data);
                case 'download':
                    downloadData(data);
                    return true;
                case 'server':
                    return saveDataToServer(data);
                default:
                    log('Invalid storage method:', method);
                    return false;
            }
        }
    };

    // Log initial state
    log('TWINE Response Recorder initialized successfully');
    log('API available at window.TWINE_RECORDER');

})();