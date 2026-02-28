// nft-engine.js — Lazy-Mint NFT Engine
// Off-chain achievement NFTs with optional Polygon materialization.
(function NFTEngine() {
  'use strict';

  // ════════════════════════════════════════════════════════
  // CONFIG
  // ════════════════════════════════════════════════════════

  var CONTRACT_ADDRESS = null; // Set after deploying AchievementNFT.sol to Polygon
  var POLYGON_CHAIN_ID = '0x89';
  var POLYGON_RPC = 'https://polygon-rpc.com';
  var POLYGON_EXPLORER = 'https://polygonscan.com';

  var CONTRACT_ABI = [
    'function materialize(string achievementId, string name, uint8 rarity, uint64 earnedAt, bytes32 tokenHash) external',
    'function hasMaterialized(address, bytes32) view returns (bool)',
    'function tokenURI(uint256) view returns (string)',
    'function balanceOf(address) view returns (uint256)',
    'function tokenOfOwnerByIndex(address, uint256) view returns (uint256)',
    'function totalSupply() view returns (uint256)'
  ];

  var RARITY_NUM = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };
  var RARITY_NAMES = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];
  var RARITY_COLORS = {
    0: { main: '#6b7a90', bg1: '#1a1e2e', bg2: '#0f1118', glow: 'rgba(107,122,144,.15)', border: 'rgba(107,122,144,.25)' },
    1: { main: '#3b82f6', bg1: '#0c1a3a', bg2: '#060e22', glow: 'rgba(59,130,246,.2)',  border: 'rgba(59,130,246,.3)' },
    2: { main: '#a855f7', bg1: '#1a0c3a', bg2: '#0e0620', glow: 'rgba(168,85,247,.2)',  border: 'rgba(168,85,247,.3)' },
    3: { main: '#fbbf24', bg1: '#2a1f0a', bg2: '#1a1306', glow: 'rgba(251,191,36,.2)',  border: 'rgba(251,191,36,.35)' },
    4: { main: '#06b6d4', bg1: '#041e26', bg2: '#021218', glow: 'rgba(6,182,212,.25)',   border: 'rgba(6,182,212,.4)' }
  };

  // ════════════════════════════════════════════════════════
  // SVG GENERATOR
  // ════════════════════════════════════════════════════════

  function hashCode(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
    return Math.abs(h);
  }

  function generateSVG(achv, tokenHash, earnedAt) {
    var rNum = typeof achv.rarity === 'number' ? achv.rarity : (RARITY_NUM[achv.rarity] || 0);
    var rc = RARITY_COLORS[rNum];
    var rName = RARITY_NAMES[rNum];
    var seed = hashCode(tokenHash || achv.id);
    var angle = 130 + (seed % 40);
    var date = earnedAt ? new Date(earnedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
    var shimmer = rNum >= 3 ? '<rect x="0" y="0" width="400" height="400" rx="24" fill="url(#shimmer)" opacity=".08"><animate attributeName="x" values="-400;400" dur="' + (4 - rNum * 0.5) + 's" repeatCount="indefinite"/></rect>' : '';
    var glowRing = rNum >= 2 ? '<circle cx="200" cy="155" r="50" fill="none" stroke="' + rc.main + '" stroke-width="1" stroke-opacity=".15"><animate attributeName="r" values="48;55;48" dur="3s" repeatCount="indefinite"/><animate attributeName="stroke-opacity" values=".1;.25;.1" dur="3s" repeatCount="indefinite"/></circle>' : '';
    var mythicRing = rNum === 4 ? '<circle cx="200" cy="155" r="60" fill="none" stroke="url(#rainbow)" stroke-width="1.5" stroke-dasharray="8 6" stroke-opacity=".3"><animateTransform attributeName="transform" type="rotate" values="0 200 155;360 200 155" dur="12s" repeatCount="indefinite"/></circle>' : '';

    return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">' +
      '<defs>' +
        '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(' + angle + ')">' +
          '<stop offset="0%" stop-color="' + rc.bg1 + '"/>' +
          '<stop offset="100%" stop-color="' + rc.bg2 + '"/>' +
        '</linearGradient>' +
        '<linearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="' + rc.main + '" stop-opacity="0"/>' +
          '<stop offset="50%" stop-color="' + rc.main + '" stop-opacity="1"/>' +
          '<stop offset="100%" stop-color="' + rc.main + '" stop-opacity="0"/>' +
        '</linearGradient>' +
        (rNum === 4 ? '<linearGradient id="rainbow" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#06b6d4"/><stop offset="33%" stop-color="#a855f7"/><stop offset="66%" stop-color="#ec4899"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient>' : '') +
      '</defs>' +
      '<rect width="400" height="400" rx="24" fill="url(#bg)"/>' +
      '<rect x="2" y="2" width="396" height="396" rx="22" fill="none" stroke="' + rc.main + '" stroke-opacity=".2" stroke-width="1.5"/>' +
      shimmer +
      glowRing +
      mythicRing +
      '<text x="200" y="165" text-anchor="middle" font-size="56">' + (achv.icon || '🏆') + '</text>' +
      '<text x="200" y="210" text-anchor="middle" font-family="\'JetBrains Mono\',monospace" font-size="14" fill="white" font-weight="bold">' + escXml(achv.name || achv.id) + '</text>' +
      '<text x="200" y="232" text-anchor="middle" font-family="\'JetBrains Mono\',monospace" font-size="9" fill="' + rc.main + '" letter-spacing="1.5">' + rName.toUpperCase() + '</text>' +
      '<text x="200" y="256" text-anchor="middle" font-family="\'JetBrains Mono\',monospace" font-size="8" fill="rgba(255,255,255,.35)">' + escXml(achv.desc || '') + '</text>' +
      (date ? '<text x="200" y="280" text-anchor="middle" font-family="\'JetBrains Mono\',monospace" font-size="8" fill="rgba(255,255,255,.2)">Earned ' + date + '</text>' : '') +
      '<line x1="40" y1="340" x2="360" y2="340" stroke="' + rc.main + '" stroke-opacity=".1" stroke-width="1"/>' +
      '<text x="200" y="362" text-anchor="middle" font-family="\'JetBrains Mono\',monospace" font-size="8" fill="rgba(255,255,255,.15)">amrelharony.com</text>' +
      '<text x="200" y="380" text-anchor="middle" font-family="\'JetBrains Mono\',monospace" font-size="7" fill="rgba(255,255,255,.1)">' + (tokenHash || '').slice(0, 16) + '</text>' +
    '</svg>';
  }

  function escXml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  function svgToDataUri(svg) {
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  }

  // ════════════════════════════════════════════════════════
  // TOKEN HASH GENERATOR
  // ════════════════════════════════════════════════════════

  function generateTokenHash(achievementId, earnedAt) {
    var p = getProfile();
    var raw = achievementId + ':' + earnedAt + ':' + (p.sessionStart || Date.now());
    if (window.crypto && window.crypto.subtle) {
      return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
        .then(function(buf) {
          return Array.from(new Uint8Array(buf)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
        });
    }
    var h = hashCode(raw);
    return Promise.resolve(h.toString(16).padStart(16, '0') + hashCode(raw + 'salt').toString(16).padStart(16, '0'));
  }

  // ════════════════════════════════════════════════════════
  // LAZY-MINT STORE (VDna + Supabase)
  // ════════════════════════════════════════════════════════

  function getProfile() {
    return window.VDna ? window.VDna.get() : {};
  }

  function saveProfile() {
    if (window.VDna) window.VDna.save();
  }

  function getVault() {
    var p = getProfile();
    if (!p._nftVault) p._nftVault = {};
    return p._nftVault;
  }

  function lazyMint(achievementId) {
    var vault = getVault();
    if (vault[achievementId]) return Promise.resolve(vault[achievementId]);

    var achvs = (window._game && window._game.ACHIEVEMENTS) || [];
    var achv = null;
    for (var i = 0; i < achvs.length; i++) {
      if (achvs[i].id === achievementId) { achv = achvs[i]; break; }
    }
    if (!achv) return Promise.resolve(null);

    var p = getProfile();
    var earnedAt = (p.unlocked && p.unlocked[achievementId]) || Date.now();

    return generateTokenHash(achievementId, earnedAt).then(function(tokenHash) {
      var rNum = RARITY_NUM[achv.rarity] || 0;
      var svg = generateSVG(achv, tokenHash, earnedAt);
      var entry = {
        tokenHash: tokenHash,
        achievementId: achievementId,
        name: achv.name,
        desc: achv.desc,
        icon: achv.icon,
        rarity: achv.rarity,
        rarityNum: rNum,
        xp: achv.xp,
        earnedAt: earnedAt,
        mintedAt: Date.now(),
        svgDataUri: svgToDataUri(svg),
        materialized: false,
        txHash: null,
        tokenId: null,
        chain: null
      };
      vault[achievementId] = entry;
      saveProfile();
      syncToSupabase(entry);
      return entry;
    });
  }

  function retroMint() {
    var p = getProfile();
    if (!p.unlocked) return;
    var achvs = (window._game && window._game.ACHIEVEMENTS) || [];
    var achvSet = {};
    achvs.forEach(function(a) { achvSet[a.id] = true; });
    var vault = getVault();
    var ids = Object.keys(p.unlocked);
    var pending = [];
    ids.forEach(function(id) {
      if (!vault[id] && achvSet[id]) pending.push(id);
    });
    if (pending.length === 0) return;
    function mintNext() {
      if (pending.length === 0) return;
      var id = pending.shift();
      lazyMint(id).then(function() { setTimeout(mintNext, 50); });
    }
    mintNext();
  }

  function getLazyMinted() {
    return getVault();
  }

  function getLazyMintedById(id) {
    return getVault()[id] || null;
  }

  function getLazyMintedArray() {
    var vault = getVault();
    var arr = [];
    for (var k in vault) { if (vault.hasOwnProperty(k)) arr.push(vault[k]); }
    arr.sort(function(a, b) { return (b.earnedAt || 0) - (a.earnedAt || 0); });
    return arr;
  }

  // ════════════════════════════════════════════════════════
  // SUPABASE SYNC
  // ════════════════════════════════════════════════════════

  function syncToSupabase(entry) {
    if (!window._sb) return;
    var p = getProfile();
    window._sb.from('nft_lazy_mints').upsert({
      visitor_id: p.sessionStart ? String(p.sessionStart) : 'anon',
      token_hash: entry.tokenHash,
      achievement_id: entry.achievementId,
      rarity: entry.rarity,
      earned_at: entry.earnedAt,
      minted_at: entry.mintedAt,
      materialized: entry.materialized || false,
      tx_hash: entry.txHash || null,
      chain: entry.chain || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'token_hash' }).then(function() {}).catch(function() {});
  }

  // ════════════════════════════════════════════════════════
  // WALLET CONNECTION (MetaMask via ethers.js)
  // ════════════════════════════════════════════════════════

  var _walletAddress = null;
  var _provider = null;
  var _signer = null;
  var _contract = null;
  var _ethersLoaded = false;
  var _ethersLoadPromise = null;
  var _eip6963Providers = [];

  // EIP-6963: listen for wallet announcements (modern multi-wallet standard)
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('eip6963:announceProvider', function(event) {
      if (event.detail && event.detail.provider) {
        _eip6963Providers.push(event.detail);
      }
    });
    try { window.dispatchEvent(new Event('eip6963:requestProvider')); } catch (e) {}
  }

  function getEthereumProvider() {
    if (window.ethereum) return Promise.resolve(window.ethereum);
    // Check EIP-6963 providers
    if (_eip6963Providers.length > 0) return Promise.resolve(_eip6963Providers[0].provider);
    // Wait up to 3 seconds for late-injecting wallets
    return new Promise(function(resolve) {
      var attempts = 0;
      var maxAttempts = 15;
      function check() {
        if (window.ethereum) return resolve(window.ethereum);
        if (_eip6963Providers.length > 0) return resolve(_eip6963Providers[0].provider);
        attempts++;
        if (attempts >= maxAttempts) return resolve(null);
        setTimeout(check, 200);
      }
      // Also listen for the legacy initialization event
      window.addEventListener('ethereum#initialized', function() { resolve(window.ethereum); }, { once: true });
      check();
    });
  }

  function loadEthers() {
    if (_ethersLoaded || window.ethers) { _ethersLoaded = true; return Promise.resolve(); }
    if (_ethersLoadPromise) return _ethersLoadPromise;
    _ethersLoadPromise = new Promise(function(resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/ethers/6.13.4/ethers.umd.min.js';
      s.onload = function() { _ethersLoaded = true; _ethersLoadPromise = null; resolve(); };
      s.onerror = function() { _ethersLoadPromise = null; reject(new Error('Failed to load ethers.js')); };
      document.head.appendChild(s);
    });
    return _ethersLoadPromise;
  }

  function connect() {
    showToast('Detecting wallet...', 'Searching for provider', '🔍', 'accent');
    return getEthereumProvider().then(function(eth) {
      if (!eth) {
        showToast('No wallet detected', 'Install MetaMask or another Web3 wallet', '🦊', 'warn');
        return Promise.reject(new Error('No ethereum provider'));
      }
      return loadEthers().then(function() {
        _provider = new window.ethers.BrowserProvider(eth);
        return _provider.send('eth_requestAccounts', []);
      });
    }).then(function(accounts) {
      if (!accounts || accounts.length === 0) {
        showToast('No accounts', 'Unlock your wallet and try again', '🔒', 'warn');
        return Promise.reject(new Error('No accounts returned'));
      }
      _walletAddress = accounts[0];
      _signer = null;
      localStorage.setItem('_nftWallet', _walletAddress);
      updateWalletUI();
      if (window._haptic) window._haptic.tap();
      showToast('Wallet Connected', truncAddr(_walletAddress), '🔗', 'accent');
      return _walletAddress;
    }).catch(function(err) {
      if (err && err.message !== 'No ethereum provider' && err.message !== 'No accounts returned') {
        showToast('Connection Failed', err.message || 'User rejected', '❌', 'warn');
      }
      throw err;
    });
  }

  function disconnect() {
    _walletAddress = null;
    _provider = null;
    _signer = null;
    _contract = null;
    localStorage.removeItem('_nftWallet');
    updateWalletUI();
    showToast('Wallet Disconnected', '', '🔌', 'accent');
  }

  function autoReconnect() {
    var saved = localStorage.getItem('_nftWallet');
    if (!saved) return;
    getEthereumProvider().then(function(eth) {
      if (!eth) return;
      return loadEthers().then(function() {
        _provider = new window.ethers.BrowserProvider(eth);
        return _provider.send('eth_accounts', []);
      }).then(function(accounts) {
        if (accounts.length > 0) {
          _walletAddress = accounts[0];
          updateWalletUI();
        } else {
          localStorage.removeItem('_nftWallet');
        }
      });
    }).catch(function() { localStorage.removeItem('_nftWallet'); });
  }

  function getSigner() {
    if (_signer) return Promise.resolve(_signer);
    if (!_provider) return Promise.reject(new Error('Not connected'));
    return _provider.getSigner().then(function(s) { _signer = s; return s; });
  }

  function getContract() {
    if (!CONTRACT_ADDRESS) return Promise.reject(new Error('Contract not deployed'));
    if (_contract) return Promise.resolve(_contract);
    return getSigner().then(function(signer) {
      _contract = new window.ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      return _contract;
    });
  }

  function switchToPolygon() {
    var eth = window.ethereum || (_eip6963Providers.length > 0 ? _eip6963Providers[0].provider : null);
    if (!eth) return Promise.reject(new Error('No wallet'));
    return eth.request({ method: 'eth_chainId' }).then(function(chainId) {
      if (chainId === POLYGON_CHAIN_ID) return;
      return eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_CHAIN_ID }]
      }).catch(function(err) {
        if (err.code === 4902) {
          return eth.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: POLYGON_CHAIN_ID,
              chainName: 'Polygon PoS',
              rpcUrls: [POLYGON_RPC],
              nativeCurrency: { name: 'MATIC', symbol: 'POL', decimals: 18 },
              blockExplorerUrls: [POLYGON_EXPLORER]
            }]
          });
        }
        throw err;
      });
    });
  }

  function isConnected() { return !!_walletAddress; }
  function getAddress() { return _walletAddress; }
  function truncAddr(addr) {
    if (!addr) return '';
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  }

  // ════════════════════════════════════════════════════════
  // MATERIALIZE FLOW
  // ════════════════════════════════════════════════════════

  function materialize(achievementId) {
    var entry = getLazyMintedById(achievementId);
    if (!entry) {
      showToast('NFT Not Found', 'Lazy-mint this achievement first', '❌', 'warn');
      return Promise.reject(new Error('Not lazy-minted'));
    }
    if (entry.materialized) {
      showToast('Already On-Chain', 'Token #' + entry.tokenId, '✅', 'accent');
      return Promise.resolve(entry);
    }
    if (!CONTRACT_ADDRESS) {
      showToast('Contract Not Deployed', 'Set CONTRACT_ADDRESS in nft-engine.js', '⚠️', 'warn');
      return Promise.reject(new Error('No contract'));
    }

    showMaterializeModal(entry);
    return Promise.resolve(entry);
  }

  function executeMaterialize(entry) {
    return connect()
      .then(function() { return switchToPolygon(); })
      .then(function() { return getContract(); })
      .then(function(contract) {
        var rNum = entry.rarityNum || RARITY_NUM[entry.rarity] || 0;
        var earnedSec = Math.floor(entry.earnedAt / 1000);
        var hashBytes = '0x' + entry.tokenHash.padEnd(64, '0').slice(0, 64);
        showToast('Confirming...', 'Check your wallet', '⏳', 'accent');
        return contract.materialize(
          entry.achievementId,
          entry.name,
          rNum,
          earnedSec,
          hashBytes
        );
      })
      .then(function(tx) {
        showToast('Transaction Sent', truncAddr(tx.hash), '⏳', 'accent');
        return tx.wait();
      })
      .then(function(receipt) {
        entry.materialized = true;
        entry.txHash = receipt.hash;
        entry.chain = 'polygon';
        var vault = getVault();
        vault[entry.achievementId] = entry;
        saveProfile();
        syncToSupabase(entry);
        closeMaterializeModal();
        showToast('Materialized!', 'View on Polygonscan', '✅', 'accent');
        if (window._haptic) window._haptic.success();
        if (window._game) window._game.unlock('nft_minter');
        return entry;
      })
      .catch(function(err) {
        closeMaterializeModal();
        showToast('Mint Failed', err.reason || err.message || 'Transaction rejected', '❌', 'warn');
        if (window._haptic) window._haptic.hit();
        throw err;
      });
  }

  // ════════════════════════════════════════════════════════
  // MATERIALIZE MODAL UI
  // ════════════════════════════════════════════════════════

  var _matModal = null;

  function showMaterializeModal(entry) {
    if (_matModal) _matModal.remove();
    _matModal = document.createElement('div');
    _matModal.id = 'nftMaterializeModal';
    _matModal.className = 'nft-mat-overlay';
    _matModal.addEventListener('click', function(e) { if (e.target === _matModal) closeMaterializeModal(); });

    var rc = RARITY_COLORS[entry.rarityNum || 0];
    var rName = RARITY_NAMES[entry.rarityNum || 0];

    _matModal.innerHTML =
      '<div class="nft-mat-panel">' +
        '<div class="nft-mat-preview"><img src="' + entry.svgDataUri + '" alt="NFT Preview" class="nft-mat-svg"/></div>' +
        '<div class="nft-mat-info">' +
          '<div class="nft-mat-name">' + escXml(entry.name) + '</div>' +
          '<div class="nft-mat-rarity" style="color:' + rc.main + '">' + rName + ' Achievement</div>' +
          '<div class="nft-mat-detail">Chain: Polygon PoS</div>' +
          '<div class="nft-mat-detail">Gas: ~0.001 MATIC (~$0.001)</div>' +
          (isConnected() ? '<div class="nft-mat-detail">Wallet: ' + truncAddr(_walletAddress) + '</div>' : '') +
        '</div>' +
        '<button class="nft-mat-btn" id="nftMatBtn">⛓️ Materialize to Polygon</button>' +
        '<div class="nft-mat-cancel" id="nftMatCancel">Cancel</div>' +
      '</div>';

    document.body.appendChild(_matModal);
    requestAnimationFrame(function() { _matModal.classList.add('show'); });

    document.getElementById('nftMatBtn').addEventListener('click', function() {
      var btn = document.getElementById('nftMatBtn');
      btn.textContent = '⏳ Waiting for wallet...';
      btn.disabled = true;
      btn.classList.add('pending');
      executeMaterialize(entry);
    });
    document.getElementById('nftMatCancel').addEventListener('click', closeMaterializeModal);
    if (window._haptic) window._haptic.tap();
  }

  function closeMaterializeModal() {
    if (_matModal) {
      _matModal.classList.remove('show');
      setTimeout(function() { if (_matModal) { _matModal.remove(); _matModal = null; } }, 350);
    }
  }

  // ════════════════════════════════════════════════════════
  // WALLET HUD UI
  // ════════════════════════════════════════════════════════

  function createWalletButton() {
    var container = document.getElementById('topBtns');
    if (!container || document.getElementById('walletBtn')) return;
    var btn = document.createElement('button');
    btn.className = 'tbtn nft-wallet-btn';
    btn.id = 'walletBtn';
    btn.setAttribute('aria-label', 'NFT Wallet');
    btn.style.display = 'none';
    btn.innerHTML = '<i class="fa-solid fa-wallet"></i><span class="nft-wallet-dot" id="walletDot"></span>';
    btn.addEventListener('click', function() {
      if (isConnected()) {
        if (window._game) window._game.openCase('nfts');
        else disconnect();
      } else {
        connect();
      }
    });
    container.appendChild(btn);
  }

  function updateWalletUI() {
    var btn = document.getElementById('walletBtn');
    var dot = document.getElementById('walletDot');
    if (!btn) return;
    if (isConnected()) {
      btn.classList.add('connected');
      btn.title = truncAddr(_walletAddress);
      if (dot) dot.style.display = 'block';
    } else {
      btn.classList.remove('connected');
      btn.title = 'Connect Wallet';
      if (dot) dot.style.display = 'none';
    }
  }

  // ════════════════════════════════════════════════════════
  // NFTs TAB RENDERER (called from gamification.js)
  // ════════════════════════════════════════════════════════

  function renderNFTsTab(body) {
    var nfts = getLazyMintedArray();
    var totalMinted = nfts.length;
    var totalMaterialized = nfts.filter(function(n) { return n.materialized; }).length;

    var html = '<div class="nft-tab-header">';

    // Wallet connection
    if (isConnected()) {
      html += '<div class="nft-wallet-pill">' +
        '<span class="nft-wallet-addr">' + truncAddr(_walletAddress) + '</span>' +
        '<button class="nft-wallet-disconnect" id="nftDisconnectBtn">Disconnect</button>' +
      '</div>';
    } else {
      html += '<button class="nft-connect-btn" id="nftConnectBtn"><i class="fa-solid fa-wallet" style="margin-right:4px"></i>Connect Wallet</button>';
    }

    html += '</div>';

    // Stats bar
    html += '<div class="nft-stats-bar">' +
      '<div class="nft-stat"><span class="nft-stat-val">' + totalMinted + '</span><span class="nft-stat-lbl">Collected</span></div>' +
      '<div class="nft-stat"><span class="nft-stat-val">' + totalMaterialized + '</span><span class="nft-stat-lbl">On-Chain</span></div>' +
      '<div class="nft-stat"><span class="nft-stat-val">' + ((window._game && window._game.ACHIEVEMENTS) ? window._game.ACHIEVEMENTS.length : '?') + '</span><span class="nft-stat-lbl">Total</span></div>' +
    '</div>';

    if (nfts.length === 0) {
      html += '<div class="nft-empty">Unlock achievements to collect NFTs!</div>';
    } else {
      html += '<div class="nft-grid">';
      nfts.forEach(function(n) {
        var rc = RARITY_COLORS[n.rarityNum || 0];
        var rName = RARITY_NAMES[n.rarityNum || 0];
        html += '<div class="nft-card ' + n.rarity + '" data-nft-id="' + n.achievementId + '">' +
          '<div class="nft-card-img"><img src="' + n.svgDataUri + '" alt="' + escXml(n.name) + '" loading="lazy"/></div>' +
          '<div class="nft-card-body">' +
            '<div class="nft-card-name">' + escXml(n.name) + '</div>' +
            '<div class="nft-card-rarity" style="color:' + rc.main + '">' + rName + '</div>' +
            '<div class="nft-card-date">' + new Date(n.earnedAt).toLocaleDateString() + '</div>' +
            '<div class="nft-card-status ' + (n.materialized ? 'on-chain' : 'off-chain') + '">' +
              (n.materialized ? '⛓️ On-chain' : '☁️ Collected') +
            '</div>' +
          '</div>' +
          '<div class="nft-card-actions">' +
            (n.materialized
              ? '<a href="' + POLYGON_EXPLORER + '/tx/' + n.txHash + '" target="_blank" rel="noopener" class="nft-card-action">View TX</a>'
              : '<button class="nft-card-action nft-card-materialize" data-mid="' + n.achievementId + '">' +
                  (CONTRACT_ADDRESS ? 'Materialize' : 'Preview') +
                '</button>'
            ) +
            '<button class="nft-card-action nft-card-download" data-did="' + n.achievementId + '">Download</button>' +
          '</div>' +
        '</div>';
      });
      html += '</div>';
    }

    body.innerHTML = html;

    // Bind events
    var connectBtn = document.getElementById('nftConnectBtn');
    if (connectBtn) connectBtn.addEventListener('click', function() { connect().then(function() { renderNFTsTab(body); }); });
    var disconnectBtn = document.getElementById('nftDisconnectBtn');
    if (disconnectBtn) disconnectBtn.addEventListener('click', function() { disconnect(); renderNFTsTab(body); });

    body.querySelectorAll('.nft-card-materialize').forEach(function(btn) {
      btn.addEventListener('click', function() {
        materialize(btn.dataset.mid);
      });
    });

    body.querySelectorAll('.nft-card-download').forEach(function(btn) {
      btn.addEventListener('click', function() {
        downloadSVG(btn.dataset.did);
      });
    });
  }

  // ════════════════════════════════════════════════════════
  // DOWNLOAD SVG
  // ════════════════════════════════════════════════════════

  function downloadSVG(achievementId) {
    var entry = getLazyMintedById(achievementId);
    if (!entry) return;
    var achvs = (window._game && window._game.ACHIEVEMENTS) || [];
    var achv = null;
    for (var i = 0; i < achvs.length; i++) {
      if (achvs[i].id === achievementId) { achv = achvs[i]; break; }
    }
    if (!achv) return;
    var svg = generateSVG(achv, entry.tokenHash, entry.earnedAt);
    var blob = new Blob([svg], { type: 'image/svg+xml' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'achievement-' + achievementId + '.svg';
    a.click();
    URL.revokeObjectURL(url);
    if (window._haptic) window._haptic.tap();
  }

  // ════════════════════════════════════════════════════════
  // TOAST HELPER
  // ════════════════════════════════════════════════════════

  function showToast(title, desc, icon, type) {
    if (window.UniToast && window.UniToast.add) {
      window.UniToast.add(title, desc, icon, type || 'accent');
      return;
    }
    var container = document.getElementById('toastContainer');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = '<div class="toast-shimmer"></div>' +
      '<div class="toast-emoji">' + (icon || '🔔') + '</div>' +
      '<div class="toast-body">' +
        '<div class="toast-title">' + title + '</div>' +
        (desc ? '<div class="toast-desc">' + desc + '</div>' : '') +
      '</div>';
    container.appendChild(toast);
    setTimeout(function() { toast.classList.add('show'); }, 50);
    setTimeout(function() { toast.classList.remove('show'); setTimeout(function() { toast.remove(); }, 500); }, 4000);
  }

  // ════════════════════════════════════════════════════════
  // TERMINAL COMMANDS
  // ════════════════════════════════════════════════════════

  function registerTerminalCommands() {
    if (!window.TermCmds) window.TermCmds = {};
    var T = window.TermCmds;

    T.wallet = function() {
      if (isConnected()) {
        return '<span class="term-green">Connected:</span> ' + _walletAddress +
          '\n<span class="term-gray">Type "disconnect" to disconnect</span>';
      }
      connect();
      return '<span class="term-cyan">Connecting wallet...</span>';
    };
    T.connect = T.wallet;
    T.disconnect = function() {
      if (!isConnected()) return '<span class="term-gray">No wallet connected.</span>';
      disconnect();
      return '<span class="term-green">Wallet disconnected.</span>';
    };

    T.nfts = function() {
      var nfts = getLazyMintedArray();
      if (nfts.length === 0) return '<span class="term-gray">No NFTs collected. Unlock achievements to earn NFTs!</span>';
      var out = '<span class="term-cyan">NFT Collection (' + nfts.length + ')</span>\n';
      nfts.forEach(function(n) {
        var status = n.materialized ? '<span class="term-green">⛓️ ON-CHAIN</span>' : '<span class="term-gray">☁️ off-chain</span>';
        out += '  ' + n.icon + ' <span class="term-white">' + n.name + '</span> — ' + status + '\n';
      });
      return out.trim();
    };

    T.nft = function() {
      if (window._game) { setTimeout(function() { window._game.openCase('nfts'); }, 200); }
      return '<span class="term-cyan">Opening NFT gallery...</span>';
    };

    T.materialize = function(args) {
      var id = args ? args.trim() : '';
      if (!id) return '<span class="term-gray">Usage: materialize &lt;achievement_id&gt;</span>\n<span class="term-gray">Example: materialize explorer</span>';
      var entry = getLazyMintedById(id);
      if (!entry) return '<span class="term-red">NFT "' + id + '" not found. Unlock and collect it first.</span>';
      if (entry.materialized) return '<span class="term-green">Already on-chain! TX: ' + entry.txHash + '</span>';
      if (!CONTRACT_ADDRESS) return '<span class="term-yellow">Contract not deployed yet. Materialization unavailable.</span>';
      materialize(id);
      return '<span class="term-cyan">Starting materialization for "' + id + '"...</span>';
    };

    T.download = function(args) {
      var id = args ? args.trim() : '';
      if (!id) return '<span class="term-gray">Usage: download &lt;achievement_id&gt;</span>';
      var entry = getLazyMintedById(id);
      if (!entry) return '<span class="term-red">NFT "' + id + '" not found.</span>';
      downloadSVG(id);
      return '<span class="term-green">Downloading SVG...</span>';
    };
  }

  // ════════════════════════════════════════════════════════
  // ETHEREUM EVENT LISTENERS
  // ════════════════════════════════════════════════════════

  function setupEthListeners() {
    var eth = window.ethereum || (_eip6963Providers.length > 0 ? _eip6963Providers[0].provider : null);
    if (!eth || typeof eth.on !== 'function') return;
    eth.on('accountsChanged', function(accounts) {
      if (accounts.length === 0) {
        _walletAddress = null;
        updateWalletUI();
      } else {
        _walletAddress = accounts[0];
        _signer = null;
        _contract = null;
        updateWalletUI();
      }
    });
    eth.on('chainChanged', function() {
      _signer = null;
      _contract = null;
    });
  }

  // ════════════════════════════════════════════════════════
  // INIT
  // ════════════════════════════════════════════════════════

  function init() {
    if (!window.VDna) { setTimeout(init, 300); return; }

    createWalletButton();
    autoReconnect();
    setupEthListeners();

    setTimeout(function() {
      registerTerminalCommands();
      if (window._game && window._game.ACHIEVEMENTS) retroMint();
      var btn = document.getElementById('walletBtn');
      if (btn) btn.style.display = 'flex';
    }, 5000);
  }

  // ════════════════════════════════════════════════════════
  // PUBLIC API
  // ════════════════════════════════════════════════════════

  window._closeNftModal = closeMaterializeModal;

  window._nft = {
    lazyMint: lazyMint,
    getLazyMinted: getLazyMinted,
    getLazyMintedById: getLazyMintedById,
    getLazyMintedArray: getLazyMintedArray,
    materialize: materialize,
    connect: connect,
    disconnect: disconnect,
    getAddress: getAddress,
    isConnected: isConnected,
    generateSVG: generateSVG,
    downloadSVG: downloadSVG,
    renderNFTsTab: renderNFTsTab,
    CONTRACT_ADDRESS: CONTRACT_ADDRESS
  };

  init();

})();
