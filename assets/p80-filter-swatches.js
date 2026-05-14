async function getSwatches() {
    try {
        const data = await (await fetch(`/pages/filter-swatches`)).text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.toString(), 'text/html');
        
        // Try enhanced swatches first
        const enhancedNode = doc.querySelector('.filter-swatches-enhanced');
        if (enhancedNode) {
            const content = enhancedNode.textContent?.trim();
            if (content) {
                return JSON.parse(content);
            }
        }
        
        // Fallback to original swatches
        const originalNodes = doc.querySelectorAll('.filter-swatches:not(.filter-swatches-enhanced)');
        let swatches = {};
        
        originalNodes.forEach(element => {
            const content = (element.textContent || '').trim();
            if (content) {
                try {
                    const parsed = JSON.parse(content);
                    // Only add swatches that have actual image URLs
                    for (const name in parsed) {
                        if (parsed[name] && parsed[name].trim() !== '') {
                            swatches[name] = parsed[name];
                        }
                    }
                } catch (e) {
                    console.warn('Failed to parse swatch data:', e);
                }
            }
        });
        
        return swatches;
    } catch (e) {
        console.log('No swatches found.');
        return {};
    }
}

function applySwatches(swatches) {
    // Only apply if we have valid swatches
    if (!swatches || Object.keys(swatches).length === 0) {
        console.log('No valid swatches to apply');
        return;
    }
    
    // Remove any existing swatch styles
    const existingStyle = document.getElementById('swatch-styles');
    if (existingStyle) {
        existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'swatch-styles';
    document.head.appendChild(style);
    const styleSheet = style.sheet;
    
    let appliedCount = 0;
    for (const name in swatches) {
        if (swatches[name] && swatches[name].trim() !== '') {
            // Apply background image and ensure it covers properly
            const rule = `.swatch-color[data-color="${name}"] { 
                background-image: url(${swatches[name]}) !important; 
                background-size: cover !important; 
                background-position: center !important; 
                background-repeat: no-repeat !important;
            }`;
            try {
                styleSheet.insertRule(rule);
                appliedCount++;
            } catch (e) {
                console.warn('Failed to insert CSS rule for', name, ':', e);
            }
        }
    }
    
    console.log(`Applied ${appliedCount} swatch images`);
    
    if (appliedCount === 0) {
        style.remove();
    }
}

// Run once when DOM is ready
let swatchesApplied = false;
window.addEventListener('DOMContentLoaded', () => {
    if (!swatchesApplied) {
        swatchesApplied = true;
        getSwatches().then(applySwatches);
    }
});