function switchTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelector(`.tab[onclick="switchTab('${tabId}')"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

function resetInputs() {
    document.getElementById("ipInput").value = "";
    document.getElementById("ipError").innerText = "";
    document.getElementById("subnetOutput").style.display = "none";
    document.getElementById("supernetOutput").style.display = "none";
    document.getElementById("networkInputs").innerHTML = "";
    document.getElementById("calculateSupernetBtn").style.display = "none";
}

// Network Class and Mask Functions
function getNetworkClass(ip) {
    const firstOctet = ip[0];
    if (firstOctet <= 127) return 'A';
    if (firstOctet <= 191) return 'B';
    if (firstOctet <= 223) return 'C';
    if (firstOctet <= 239) return 'D';
    return 'E';
}

function getDefaultMask(networkClass) {
    switch(networkClass) {
        case 'A': return [255, 0, 0, 0];
        case 'B': return [255, 255, 0, 0];
        case 'C': return [255, 255, 255, 0];
        default: return [255, 255, 255, 255];
    }
}

// IP Address Calculation Functions
function getNetworkID(ip, mask) {
    return ip.map((octet, index) => octet & mask[index]);
}

function getBroadcastAddress(networkId, mask) {
    return networkId.map((octet, index) => 
        octet | (mask[index] ^ 255));
}

function getFirstUsableAddress(networkId) {
    const first = [...networkId];
    first[3] += 1;
    return first;
}

function getLastUsableAddress(broadcast) {
    const last = [...broadcast];
    last[3] -= 1;
    return last;
}

function getNumberOfHosts(mask) {
    const hostBits = 32 - mask.reduce((acc, octet) => 
        acc + octet.toString(2).split('1').length - 1, 0);
    return Math.pow(2, hostBits) - 2;
}

// IP Validation and Conversion
function validateIPFormat(ip, type) {
    const ipParts = ip.split('.');
    if (ipParts.length !== 4) return false;
    
    switch (type) {
        case 'DEC':
            return ipParts.every(part => {
                const num = parseInt(part, 10);
                return !isNaN(num) && num >= 0 && num <= 255;
            });
        case 'BIN':
            return ipParts.every(part => {
                return /^[01]{8}$/.test(part);
            });
        case 'OCT':
            return ipParts.every(part => {
                const num = parseInt(part, 8);
                return !isNaN(num) && num >= 0 && num <= 255;
            });
        case 'HEX':
            return ipParts.every(part => {
                return /^[0-9A-Fa-f]{2}$/.test(part);
            });
        default:
            return false;
    }
}

function convertToDecimal(ip, type) {
    const ipParts = ip.split('.');
    switch (type) {
        case 'DEC':
            return ipParts.map(part => parseInt(part, 10));
        case 'BIN':
            return ipParts.map(part => parseInt(part, 2));
        case 'OCT':
            return ipParts.map(part => parseInt(part, 8));
        case 'HEX':
            return ipParts.map(part => parseInt(part, 16));
        default:
            return null;
    }
}

function convertFromDecimal(ip, type) {
    switch (type) {
        case 'DEC':
            return ip.join('.');
        case 'BIN':
            return ip.map(part => part.toString(2).padStart(8, '0')).join('.');
        case 'OCT':
            return ip.map(part => part.toString(8).padStart(3, '0')).join('.');
        case 'HEX':
            return ip.map(part => part.toString(16).padStart(2, '0').toUpperCase()).join('.');
        default:
            return null;
    }
}

function generateSubnetMask(bits) {
    const mask = new Array(4).fill(0);
    for (let i = 0; i < 4; i++) {
        if (bits >= 8) {
            mask[i] = 255;
            bits -= 8;
        } else if (bits > 0) {
            mask[i] = 256 - Math.pow(2, 8 - bits);
            bits = 0;
        }
    }
    return mask;
}

function ipToString(ip, format) {
    return convertFromDecimal(ip, format);
}

// Subnet Calculation Functions
function getSubnetInfo(networkId, newMaskBits, index) {
    const subnetSize = Math.pow(2, 32 - newMaskBits);
    const subnetId = [...networkId];
    const lastIndex = Math.floor(index / Math.pow(2, (24 - newMaskBits)));
    const thirdIndex = Math.floor((index % Math.pow(2, (24 - newMaskBits))) / Math.pow(2, (16 - newMaskBits)));
    const secondIndex = Math.floor((index % Math.pow(2, (16 - newMaskBits))) / Math.pow(2, (8 - newMaskBits)));
    const firstIndex = index % Math.pow(2, (8 - newMaskBits));
    
    subnetId[0] += lastIndex;
    subnetId[1] += thirdIndex;
    subnetId[2] += secondIndex;
    subnetId[3] += firstIndex * Math.pow(2, (32 - newMaskBits));
    
    const subnetMask = generateSubnetMask(newMaskBits);
    const broadcast = getBroadcastAddress(subnetId, subnetMask);
    const firstHost = getFirstUsableAddress(subnetId);
    const lastHost = getLastUsableAddress(broadcast);
    const totalAddresses = getNumberOfHosts(subnetMask);
    
    return {
        subnetId,
        mask: subnetMask,
        broadcast,
        firstHost,
        lastHost,
        totalAddresses
    };
}

function calculateSubnet() {
    const ipInput = document.getElementById("ipInput").value.trim();
    const inputType = document.getElementById("inputType").value;
    const numSubnets = parseInt(document.getElementById("numSubnets").value, 10);

    // Clear previous errors
    document.getElementById("ipError").innerText = "";
    document.getElementById("subnetError").innerText = "";

    // Validate inputs
    if (!validateIPFormat(ipInput, inputType)) {
        document.getElementById("ipError").innerText = 
            `Please enter a valid ${inputType} IP Address`;
        return;
    }
    if (isNaN(numSubnets) || numSubnets < 1) {
        document.getElementById("subnetError").innerText = 
            "Please enter a valid number of subnets";
        return;
    }

    // Convert IP to decimal
    const decimalIP = convertToDecimal(ipInput, inputType);
    const networkClass = getNetworkClass(decimalIP);
    const defaultMask = getDefaultMask(networkClass);
    const networkId = getNetworkID(decimalIP, defaultMask);

    // Calculate new mask for subnetting
    const subnetBits = Math.ceil(Math.log2(numSubnets));
    const newMaskBits = (networkClass === 'C' ? 24 : 
                       networkClass === 'B' ? 16 : 8) + subnetBits;

    // Calculate subnet information
    const subnets = [];
    for (let i = 0; i < numSubnets; i++) {
        const subnetInfo = getSubnetInfo(networkId, newMaskBits, i);
        subnets.push({
            ...subnetInfo,
            number: i + 1
        });
    }

    // Generate results HTML
    const resultsHTML = `
        <div class="network-info">
            <h3>Network Information</h3>
            <p>IP Address: ${ipToString(decimalIP, inputType)}</p>
            <p>Network Class: ${networkClass}</p>
            <p>Default Mask: ${ipToString(defaultMask, inputType)}</p>
            <p>Network ID: ${ipToString(networkId, inputType)}</p>
            <p>New Subnet Mask: /${newMaskBits} (${ipToString(generateSubnetMask(newMaskBits), inputType)})</p>
        </div>
        
        <div class="subnet-details">
            <h3>Subnet Details</h3>
            <table class="subnet-table">
                <tr>
                    <th>Subnet #</th>
                    <th>Subnet ID</th>
                    <th>First Address</th>
                    <th>Last Address</th>
                    <th>Broadcast</th>
                    <th>Total Usable</th>
                </tr>
                ${subnets.map(subnet => `
                    <tr>
                        <td>${subnet.number}</td>
                        <td>${ipToString(subnet.subnetId, inputType)}</td>
                        <td>${ipToString(subnet.firstHost, inputType)}</td>
                        <td>${ipToString(subnet.lastHost, inputType)}</td>
                        <td>${ipToString(subnet.broadcast, inputType)}</td>
                        <td>${subnet.totalAddresses}</td>
                    </tr>
                `).join('')}
            </table>
        </div>
    `;
    
    // Display results
    const outputDiv = document.getElementById("subnetOutput");
    outputDiv.style.display = "block";
    document.getElementById("subnetResults").innerHTML = resultsHTML;
}

// Supernetting functions
function generateNetworkInputs() {
    const numNetworks = parseInt(document.getElementById("numNetworks").value, 10);
    if (isNaN(numNetworks) || numNetworks < 2) {
        document.getElementById("networkError").innerText = 
            "Please enter a valid number of networks (minimum 2)";
        return;
    }
    
    let html = '<div class="form-group">';
    for (let i = 0; i < numNetworks; i++) {
        html += `
            <label for="network${i}">Network ${i + 1}:</label>
            <input type="text" id="network${i}" class="network-input" 
                   placeholder="Enter network address">
            <div id="networkError${i}" class="error"></div>
        `;
    }
    html += '</div>';
    
    document.getElementById("networkInputs").innerHTML = html;
    document.getElementById("calculateSupernetBtn").style.display = "block";
}

function findCommonPrefix(binaryNetworks) {
    let commonPrefix = '';
    const firstNetwork = binaryNetworks[0];
    
    for (let i = 0; i < firstNetwork.length; i++) {
        const bit = firstNetwork[i];
        if (binaryNetworks.every(network => network[i] === bit)) {
            commonPrefix += bit;
        } else {
            break;
        }
    }
    
    return commonPrefix;
}

function calculateSupernet() {
    const inputType = document.getElementById("inputType").value;
    const networkInputs = document.getElementsByClassName("network-input");
    const networks = [];
    
    // Clear previous errors
    document.getElementById("networkError").innerText = "";
    
    // Validate and collect network addresses
    for (let input of networkInputs) {
        const value = input.value.trim();
        if (!validateIPFormat(value, inputType)) {
            document.getElementById("networkError").innerText = 
                `Please enter valid ${inputType} network addresses`;
            return;
        }
        networks.push(convertToDecimal(value, inputType));
    }
    
    // Find the common network prefix
    const binaryNetworks = networks.map(network => 
        network.map(octet => octet.toString(2).padStart(8, '0')).join(''));
    
    const commonPrefix = findCommonPrefix(binaryNetworks);
    const maskLength = commonPrefix.length;
    
    // Calculate supernet mask and network address
    const supernet = {
        network: networks[0].map((octet, index) => {
            const mask = generateSubnetMask(maskLength)[index];
            return octet & mask;
        }),
        mask: generateSubnetMask(maskLength)
    };

    // Calculate the range of addresses
    const firstNetwork = networks.reduce((min, curr) => {
        return curr.map((octet, i) => octet < min[i] ? octet : min[i]);
    }, networks[0]);

    const lastNetwork = networks.reduce((max, curr) => {
        return curr.map((octet, i) => octet > max[i] ? octet : max[i]);
    }, networks[0]);

    // Generate results HTML
    const resultsHTML = `
        <div class="network-info">
            <h3>Supernetting Results</h3>
            <p>Supernet Address: ${ipToString(supernet.network, inputType)}</p>
            <p>Supernet Mask: ${ipToString(supernet.mask, inputType)} (/${maskLength})</p>
            <p>Number of Combined Networks: ${networks.length}</p>
            <p>Address Range: ${ipToString(firstNetwork, inputType)} - ${ipToString(lastNetwork, inputType)}</p>
            <p>Total Addresses: ${getNumberOfHosts(supernet.mask)}</p>
        </div>

        <div class="subnet-details">
            <h3>Original Networks</h3>
            <table class="subnet-table">
                <tr>
                    <th>Network #</th>
                    <th>Network Address</th>
                </tr>
                ${networks.map((network, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${ipToString(network, inputType)}</td>
                    </tr>
                `).join('')}
            </table>
        </div>
    `;
    
    // Display results
    const outputDiv = document.getElementById("supernetOutput");
    outputDiv.style.display = "block";
    document.getElementById("supernetResults").innerHTML = resultsHTML;
}