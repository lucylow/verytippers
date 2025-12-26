// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./TipRouter.sol";

/**
 * @title VeryTippersNFT - NFT Collection for VERY Chain Hackathon
 * @dev Production ERC721 with tipping integration, rarity tiers, and metadata
 * Features: Dynamic metadata, tip-gated minting, rarity system, VERY Chain optimized
 */
contract VeryTippersNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    using Strings for uint256;
    
    // ========== STATE ==========
    
    /// @notice ERC721 token counter
    Counters.Counter private _tokenIdCounter;
    
    /// @notice TipRouter contract for NFT-gated tipping
    TipRouter public immutable tipRouter;
    
    /// @notice Base URI for metadata (IPFS)
    string private _baseTokenURI;
    
    /// @notice Rarity tiers (0=Common, 1=Rare, 2=Epic, 3=Legendary)
    mapping(uint256 => uint8) public tokenRarity;
    
    /**
     * @notice Get rarity for a specific token (external view function)
     * @param tokenId The token ID to query
     * @return The rarity tier (0=Common, 1=Rare, 2=Epic, 3=Legendary)
     */
    function getTokenRarity(uint256 tokenId) external view returns (uint8) {
        require(_exists(tokenId), "Token does not exist");
        return tokenRarity[tokenId];
    }
    
    /// @notice Tip threshold per rarity (in wei) to mint special NFTs
    mapping(uint8 => uint256) public rarityTipThreshold;
    
    /// @notice Total tips received by address for NFT eligibility
    mapping(address => uint256) public totalTipsReceived;
    
    /// @notice Contract metadata URI
    string public contractURI;
    
    /// @notice Minting enabled
    bool public mintingEnabled = true;
    
    // Rarity distribution (total supply percentages)
    uint256 public constant TOTAL_SUPPLY = 10000;
    uint256 public constant COMMON_SUPPLY = 7000;  // 70%
    uint256 public constant RARE_SUPPLY = 2000;    // 20%
    uint256 public constant EPIC_SUPPLY = 800;     // 8%
    uint256 public constant LEGENDARY_SUPPLY = 200; // 2%
    
    // ========== EVENTS ==========
    
    event NFTMinted(uint256 indexed tokenId, address indexed to, uint8 rarity, uint256 tipAmount);
    event RarityUpgraded(uint256 indexed tokenId, uint8 oldRarity, uint8 newRarity);
    event TipRouterUpdated(address oldRouter, address newRouter);
    event MintingToggled(bool enabled);
    
    // ========== ERRORS ==========
    
    error MintingDisabled();
    error MaxSupplyReached();
    error InsufficientTips();
    error InvalidRarity();
    error ZeroAddress();
    
    // ========== CONSTRUCTOR ==========
    
    constructor(
        address _tipRouter,
        string memory baseURI_,
        string memory contractURI_
    ) ERC721("VeryTippers NFT", "VTIP") {
        if (_tipRouter == address(0)) revert ZeroAddress();
        
        tipRouter = TipRouter(_tipRouter);
        _baseTokenURI = baseURI_;
        contractURI = contractURI_;
        
        // Set tip thresholds for rarity (in VERY wei)
        rarityTipThreshold[0] = 0;           // Common: Free mint
        rarityTipThreshold[1] = 1 ether;     // Rare: 1 VERY in tips
        rarityTipThreshold[2] = 5 ether;     // Epic: 5 VERY in tips  
        rarityTipThreshold[3] = 25 ether;    // Legendary: 25 VERY in tips
    }
    
    // ========== MINTING ==========
    
    /**
     * @notice Mint NFT based on total tips received (rarity-gated)
     * @param to Recipient address
     * @return tokenId Minted token ID
     */
    function mintWithTips(address to) external returns (uint256 tokenId) {
        if (!mintingEnabled) revert MintingDisabled();
        if (to == address(0)) revert ZeroAddress();
        
        // Determine rarity based on total tips received
        uint8 rarity = getRarityForTips(totalTipsReceived[to]);
        
        tokenId = _mintWithRarity(to, rarity);
        emit NFTMinted(tokenId, to, rarity, totalTipsReceived[to]);
        
        return tokenId;
    }
    
    /**
     * @notice Direct mint with specified rarity (admin only)
     * @param to Recipient
     * @param rarity 0=Common, 1=Rare, 2=Epic, 3=Legendary
     */
    function mintDirect(address to, uint8 rarity) external onlyOwner returns (uint256) {
        if (rarity > 3) revert InvalidRarity();
        return _mintWithRarity(to, rarity);
    }
    
    /**
     * @notice Internal minting logic
     */
    function _mintWithRarity(address to, uint8 rarity) internal returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        
        if (tokenId >= TOTAL_SUPPLY) revert MaxSupplyReached();
        
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        tokenRarity[tokenId] = rarity;
        
        _setTokenURI(tokenId, rarity);
        
        return tokenId;
    }
    
    // ========== RARITY UPGRADE ==========
    
    /**
     * @notice Upgrade NFT rarity based on additional tips
     * @dev Called by TipRouter indexer after tip processing
     * @param tokenId NFT to upgrade
     * @param owner Owner address (for tip tracking)
     */
    function upgradeRarity(uint256 tokenId, address owner) external {
        require(ownerOf(tokenId) == owner, "Not owner");
        
        uint8 currentRarity = tokenRarity[tokenId];
        uint8 newRarity = getRarityForTips(totalTipsReceived[owner]);
        
        if (newRarity > currentRarity) {
            tokenRarity[tokenId] = newRarity;
            _setTokenURI(tokenId, newRarity);
            emit RarityUpgraded(tokenId, currentRarity, newRarity);
        }
    }
    
    // ========== TIP INTEGRATION ==========
    
    /**
     * @notice Update total tips received (called by indexer/orchestrator)
     * @param recipient Recipient who received tips
     * @param tipAmount Total tip amount received
     */
    function recordTipsReceived(address recipient, uint256 tipAmount) external {
        require(msg.sender == address(tipRouter), "Only TipRouter");
        totalTipsReceived[recipient] += tipAmount;
    }
    
    // ========== RARITY LOGIC ==========
    
    /**
     * @notice Get rarity tier based on total tips received
     */
    function getRarityForTips(uint256 tips) public view returns (uint8) {
        if (tips >= rarityTipThreshold[3]) return 3; // Legendary
        if (tips >= rarityTipThreshold[2]) return 2; // Epic
        if (tips >= rarityTipThreshold[1]) return 1; // Rare
        return 0; // Common
    }
    
    /**
     * @notice Get rarity name for token
     */
    function getRarityName(uint256 tokenId) external view returns (string memory) {
        uint8 rarity = tokenRarity[tokenId];
        string[4] memory names = ["Common", "Rare", "Epic", "Legendary"];
        return names[rarity];
    }
    
    // ========== METADATA ==========
    
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function _setTokenURI(uint256 tokenId, uint8 rarity) internal {
        string memory rarityStr = rarity == 0 ? "common" : rarity == 1 ? "rare" : rarity == 2 ? "epic" : "legendary";
        string memory baseURI = _baseURI();
        string memory newURI = string(abi.encodePacked(baseURI, tokenId.toString(), "-", rarityStr, ".json"));
        _setTokenURI(tokenId, newURI);
    }
    
    // ========== ADMIN ==========
    
    function setBaseURI(string memory baseURI_) external onlyOwner {
        _baseTokenURI = baseURI_;
    }
    
    function setMintingEnabled(bool enabled) external onlyOwner {
        mintingEnabled = enabled;
        emit MintingToggled(enabled);
    }
    
    function setRarityThreshold(uint8 rarity, uint256 threshold) external onlyOwner {
        if (rarity > 3) revert InvalidRarity();
        rarityTipThreshold[rarity] = threshold;
    }
    
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    // ========== VIEW FUNCTIONS ==========
    
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter.current();
    }
    
    function getTokenInfo(uint256 tokenId) external view returns (
        uint8 rarity,
        uint256 tipsRequired,
        string memory rarityName
    ) {
        require(_exists(tokenId), "Token does not exist");
        rarity = tokenRarity[tokenId];
        tipsRequired = rarityTipThreshold[rarity];
        rarityName = rarity == 0 ? "Common" : rarity == 1 ? "Rare" : rarity == 2 ? "Epic" : "Legendary";
    }
    
    // ========== ERC721 OVERRIDES ==========
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
}

