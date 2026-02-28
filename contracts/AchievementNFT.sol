// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title AchievementNFT
 * @notice Lazy-mint achievement NFTs from amrelharony.com gamification engine.
 *         Users earn achievements off-chain for free; this contract lets them
 *         "materialize" those achievements on Polygon as real ERC-721 tokens
 *         with fully on-chain SVG art.
 */
contract AchievementNFT is ERC721Enumerable, Ownable {
    using Strings for uint256;

    struct Achievement {
        string achievementId;
        string name;
        uint8  rarity;        // 0=common 1=rare 2=epic 3=legendary 4=mythic
        uint64 earnedAt;
        uint64 materializedAt;
        bytes32 tokenHash;
    }

    uint256 private _nextTokenId;
    bool public soulbound;
    bool public paused;

    mapping(uint256 => Achievement) public achievements;
    mapping(address => mapping(bytes32 => bool)) public hasMaterialized;

    string[5] private _rarityNames  = ["Common", "Rare", "Epic", "Legendary", "Mythic"];
    string[5] private _rarityColors = ["#6b7a90", "#3b82f6", "#a855f7", "#fbbf24", "#06b6d4"];

    event Materialized(address indexed owner, bytes32 indexed tokenHash, uint256 tokenId, string achievementId);

    constructor() ERC721("AmrAchievement", "ACHV") Ownable(msg.sender) {}

    function materialize(
        string calldata achievementId,
        string calldata name,
        uint8 rarity,
        uint64 earnedAt,
        bytes32 tokenHash
    ) external {
        require(!paused, "Minting paused");
        require(rarity <= 4, "Invalid rarity");
        require(!hasMaterialized[msg.sender][tokenHash], "Already materialized");

        hasMaterialized[msg.sender][tokenHash] = true;
        uint256 tokenId = _nextTokenId++;

        achievements[tokenId] = Achievement({
            achievementId: achievementId,
            name: name,
            rarity: rarity,
            earnedAt: earnedAt,
            materializedAt: uint64(block.timestamp),
            tokenHash: tokenHash
        });

        _safeMint(msg.sender, tokenId);
        emit Materialized(msg.sender, tokenHash, tokenId, achievementId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        Achievement memory a = achievements[tokenId];
        string memory svg = _generateSVG(a, tokenId);
        string memory json = string(abi.encodePacked(
            '{"name":"', a.name,
            '","description":"Achievement from amrelharony.com gamification engine. Rarity: ',
            _rarityNames[a.rarity],
            '","image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)),
            '","attributes":[{"trait_type":"Rarity","value":"', _rarityNames[a.rarity],
            '"},{"trait_type":"Achievement ID","value":"', a.achievementId,
            '"},{"trait_type":"Earned","display_type":"date","value":', uint256(a.earnedAt).toString(),
            '},{"trait_type":"Materialized","display_type":"date","value":', uint256(a.materializedAt).toString(),
            '}]}'
        ));
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    function _generateSVG(Achievement memory a, uint256 tokenId) internal pure returns (string memory) {
        string memory color = _rarityColors[a.rarity];
        string memory rName = _rarityNames[a.rarity];
        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">'
            '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
            '<stop offset="0%" stop-color="#06080f"/><stop offset="100%" stop-color="#0c1020"/>'
            '</linearGradient><linearGradient id="acc" x1="0" y1="0" x2="1" y2="1">'
            '<stop offset="0%" stop-color="', color, '"/><stop offset="100%" stop-color="', color, '" stop-opacity=".4"/>'
            '</linearGradient></defs>'
            '<rect width="400" height="400" rx="24" fill="url(#bg)"/>'
            '<rect x="2" y="2" width="396" height="396" rx="22" fill="none" stroke="', color, '" stroke-opacity=".25" stroke-width="1.5"/>'
            '<text x="200" y="170" text-anchor="middle" font-size="64">',
            unicode"🏆",
            '</text>'
            '<text x="200" y="220" text-anchor="middle" font-family="monospace" font-size="16" fill="white" font-weight="bold">',
            a.name,
            '</text>'
            '<text x="200" y="248" text-anchor="middle" font-family="monospace" font-size="11" fill="', color, '">',
            rName,
            '</text>'
            '<text x="200" y="280" text-anchor="middle" font-family="monospace" font-size="9" fill="#555">amrelharony.com</text>'
            '<rect x="20" y="360" width="360" height="1" fill="', color, '" opacity=".15"/>'
            '<text x="200" y="382" text-anchor="middle" font-family="monospace" font-size="8" fill="#444">Token #',
            tokenId.toString(),
            '</text></svg>'
        ));
    }

    function setSoulbound(bool _soulbound) external onlyOwner {
        soulbound = _soulbound;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    function _update(address to, uint256 tokenId, address auth)
        internal override returns (address)
    {
        address from = _ownerOf(tokenId);
        if (soulbound && from != address(0) && to != address(0)) {
            revert("Soulbound: transfers disabled");
        }
        return super._update(to, tokenId, auth);
    }
}
