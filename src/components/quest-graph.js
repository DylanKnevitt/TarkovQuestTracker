/**
 * Quest dependency graph visualization using Cytoscape.js
 */

export class QuestGraph {
    constructor(containerId, questManager) {
        this.container = document.getElementById(containerId);
        this.questManager = questManager;
        this.cy = null;
        this.init();
    }

    init() {
        // Initialize Cytoscape
        this.cy = cytoscape({
            container: this.container,
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': '#2d3748',
                        'border-color': '#4a5568',
                        'border-width': 2,
                        'label': 'data(label)',
                        'color': '#e2e8f0',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'font-size': '10px',
                        'text-wrap': 'wrap',
                        'text-max-width': '80px',
                        'width': 'label',
                        'height': 'label',
                        'padding': '10px',
                        'shape': 'roundrectangle'
                    }
                },
                {
                    selector: 'node.completed',
                    style: {
                        'background-color': '#48bb78',
                        'border-color': '#38a169'
                    }
                },
                {
                    selector: 'node.unlocked',
                    style: {
                        'background-color': '#4299e1',
                        'border-color': '#3182ce'
                    }
                },
                {
                    selector: 'node.locked',
                    style: {
                        'background-color': '#718096',
                        'border-color': '#4a5568',
                        'opacity': 0.6
                    }
                },
                {
                    selector: 'node.lightkeeper-path',
                    style: {
                        'border-color': '#ed8936',
                        'border-width': 3
                    }
                },
                {
                    selector: 'node.kappa-required',
                    style: {
                        'border-color': '#f6ad55',
                        'border-width': 3
                    }
                },
                {
                    selector: 'node.highlighted',
                    style: {
                        'background-color': '#f6e05e',
                        'border-color': '#ecc94b',
                        'border-width': 4
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 2,
                        'line-color': '#4a5568',
                        'target-arrow-color': '#4a5568',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'arrow-scale': 1.5
                    }
                },
                {
                    selector: 'edge.highlighted',
                    style: {
                        'line-color': '#f6ad55',
                        'target-arrow-color': '#f6ad55',
                        'width': 4
                    }
                }
            ],
            layout: {
                name: 'dagre',
                rankDir: 'TB',
                nodeSep: 50,
                rankSep: 100
            },
            minZoom: 0.1,
            maxZoom: 3,
            wheelSensitivity: 0.2
        });

        // Add click handler
        this.cy.on('tap', 'node', (evt) => {
            const questId = evt.target.data('id');
            this.onNodeClick(questId);
        });

        // Add hover handler
        this.cy.on('mouseover', 'node', (evt) => {
            evt.target.style('cursor', 'pointer');
        });
    }

    /**
     * Build graph from quest data
     */
    buildGraph(quests, filterFn = null) {
        // Show loading indicator
        this.showLoading();

        // Use setTimeout to allow UI to update
        setTimeout(() => {
            this.buildGraphInternal(quests, filterFn);
        }, 100);
    }

    buildGraphInternal(quests, filterFn = null) {
        const elements = [];
        const questsToShow = filterFn ? quests.filter(filterFn) : quests;

        // Add nodes
        questsToShow.forEach(quest => {
            const classes = [];

            if (quest.completed) classes.push('completed');
            else if (quest.unlocked) classes.push('unlocked');
            else classes.push('locked');

            if (quest.lightkeeperRequired || quest.isLightkeeperPath) {
                classes.push('lightkeeper-path');
            }
            if (quest.kappaRequired) classes.push('kappa-required');

            elements.push({
                data: {
                    id: quest.id,
                    label: quest.name,
                    trader: quest.trader,
                    level: quest.minLevel
                },
                classes: classes.join(' ')
            });
        });

        // Add edges
        questsToShow.forEach(quest => {
            quest.prerequisites.forEach(prereqId => {
                // Only add edge if both nodes are in the graph
                if (questsToShow.find(q => q.id === prereqId)) {
                    elements.push({
                        data: {
                            source: prereqId,
                            target: quest.id
                        }
                    });
                }
            });
        });

        this.cy.elements().remove();
        this.cy.add(elements);
        this.applyLayout('dagre');

        // Hide loading indicator after a short delay
        setTimeout(() => this.hideLoading(), 500);
    }

    /**
     * Highlight path to a specific quest
     */
    highlightPath(questIds) {
        // Reset all highlighting
        this.cy.elements().removeClass('highlighted');

        // Highlight nodes
        questIds.forEach(id => {
            const node = this.cy.getElementById(id);
            if (node.length > 0) {
                node.addClass('highlighted');
            }
        });

        // Highlight edges between consecutive quests in path
        for (let i = 0; i < questIds.length - 1; i++) {
            const edges = this.cy.edges(`[source = "${questIds[i]}"][target = "${questIds[i + 1]}"]`);
            edges.addClass('highlighted');
        }

        // Fit to highlighted elements
        const highlightedElements = this.cy.elements('.highlighted');
        if (highlightedElements.length > 0) {
            this.cy.fit(highlightedElements, 50);
        }
    }

    /**
     * Filter graph by trader
     */
    filterByTrader(traders) {
        const quests = this.questManager.quests.filter(q =>
            traders.includes(q.trader.toLowerCase())
        );
        this.buildGraph(quests);
    }

    /**
     * Filter graph by level range
     */
    filterByLevel(minLevel, maxLevel) {
        const quests = this.questManager.getQuestsByLevel(minLevel, maxLevel);
        this.buildGraph(quests);
    }

    /**
     * Show only Lightkeeper path
     */
    showLightkeeperPath() {
        const pathQuests = this.questManager.getLightkeeperPath();
        this.buildGraph(pathQuests);
        this.cy.fit(50);
    }

    /**
     * Show path to specific quest
     */
    showPathToQuest(questId, playerLevel = 79) {
        const path = this.questManager.findPathToQuest(questId, playerLevel);
        if (path && path.length > 0) {
            this.buildGraph(this.questManager.quests);
            this.highlightPath(path.map(q => q.id));
        }
    }

    /**
     * Apply layout algorithm
     */
    applyLayout(layoutName) {
        const layoutOptions = {
            dagre: {
                name: 'dagre',
                rankDir: 'TB',
                nodeSep: 50,
                rankSep: 100,
                animate: true,
                animationDuration: 500
            },
            breadthfirst: {
                name: 'breadthfirst',
                directed: true,
                spacingFactor: 1.5,
                animate: true,
                animationDuration: 500
            },
            circle: {
                name: 'circle',
                animate: true,
                animationDuration: 500
            }
        };

        const layout = this.cy.layout(layoutOptions[layoutName] || layoutOptions.dagre);
        layout.run();
    }

    /**
     * Fit graph to container
     */
    fit() {
        this.cy.fit(50);
    }

    /**
     * Reset zoom
     */
    resetZoom() {
        this.cy.zoom(1);
        this.cy.center();
    }

    /**
     * Node click handler (can be overridden)
     */
    onNodeClick(questId) {
        console.log('Clicked quest:', questId);
        // This will be overridden by the UI controller
    }

    /**
     * Refresh graph with current quest states
     */
    refresh() {
        this.buildGraph(this.questManager.quests);
    }

    /**
     * Show loading indicator
     */
    showLoading() {
        const loading = document.getElementById('graph-loading');
        if (loading) {
            loading.classList.remove('hidden');
            loading.style.display = 'flex';
        }
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        const loading = document.getElementById('graph-loading');
        if (loading) {
            loading.classList.add('hidden');
            loading.style.display = 'none';
        }
    }

    /**
     * Export graph as image (requires cytoscape-canvas extension)
     */
    exportImage() {
        const png = this.cy.png({
            output: 'blob',
            bg: '#1a202c',
            full: true,
            scale: 2
        });
        return png;
    }
}
