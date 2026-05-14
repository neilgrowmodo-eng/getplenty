class InventoryList extends HTMLElement {
    constructor() {
        super();
        this.variantID = document.querySelector('[name="id"]');
        this.storeCountEl = document.querySelector('[data-store-count]');
        this.inventories = null;
        if (!this.variantID) return;
        this.fetchInventory(this.variantID.value);
    }

    fetchInventory(variantID) {
        if (!variantID) return;
        const fetchURL = 'https://dev80.p80w.com/get-plenty-inventory-sync/public/getInventoryCad?variantid=' + variantID;
        if (!this.storeCountEl) return;
        const storeCountEl = this.storeCountEl;
        storeCountEl.textContent = 0;
        storeCountEl.closest('modal-opener').classList.add('hidden');
        fetch(fetchURL)
            .then((response) => response.json())
            .then((response) => {
                if (response.error) {
                    console.error(response);
                    return;
                }
                if (!response.body.inventoryLocations) return;
                this.inventories = response.body.inventoryLocations;
                this.showInventory();
            })
            .catch((e) => {
                console.error(e);
            });
    }

    showInventory() {
        if (!this.inventories) return;
        if (!this.storeCountEl) return;
        this.innerHTML = '';
        let totalInventories = 0;
        const storeCountEl = this.storeCountEl;
        let storeCount = 0;
        let inventoryList = {};
        // create new object without the number prefix on keys
        for (const [key, value] of Object.entries(this.inventories)) {
            let storeName = key.split(' ');
            storeName.shift();
            storeName = storeName.join(' ');
            if (storeName.indexOf('Men\'s Uptown') !== -1)
                storeName = 'Uptown - Men\'s';
            // skip Vernon & Richmond
            if (!storeName.includes('Vernon') && !storeName.includes('Richmond') && !storeName.includes('Chinook'))
                inventoryList[storeName] = value;
        }
        // sort the object
        let allKeys = Object.keys(inventoryList);
        let tempList = {};
        allKeys.sort();
        for (let i = 0; i < allKeys.length; i++) {
           tempList[allKeys[i]] = inventoryList[allKeys[i]]
        }
        // output the html
        for (const [key, value] of Object.entries(tempList)) {
           if (value > 0) totalInventories += Number(value);
           const itemEl = document.createElement('div');
           itemEl.classList.add('item');

           const name = document.createElement('span');
           name.classList.add('name');
           name.textContent = key;

           const status = document.createElement('span');
           status.classList.add('status');

           if (value == 1) {
               status.classList.add('low-inventory');
               status.textContent = 'Low inventory';
           } else if (value < 1) {
               status.classList.add('not-available');
               status.textContent = 'Not available';
           } else {
               status.textContent = 'Available';
           }

           if (value > 0) storeCount++;

           itemEl.appendChild(name);
           itemEl.appendChild(status);
           this.appendChild(itemEl);
        }
        storeCountEl.textContent = (storeCount == 1) ? storeCount + ' store' : storeCount + ' stores';
        if (storeCount > 0)
            storeCountEl.closest('modal-opener').classList.remove('hidden');
    }
}
customElements.define('inventory-list', InventoryList);