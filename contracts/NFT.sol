// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NFT - ERC-721 NFT Contract for VeryTippers Marketplace
 * @dev Simple ERC-721 with URI storage for marketplace integration
 */
contract NFT is ERC721URIStorage, Ownable {
    uint256 public nextTokenId;
    address public admin;

    event Minted(address indexed to, uint256 tokenId, string tokenURI);

    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) Ownable(msg.sender) {
        admin = msg.sender;
        nextTokenId = 1;
    }

    /**
     * @notice Mint NFT to address with token URI
     * @param to Recipient address
     * @param tokenURI IPFS URI for metadata
     * @return tokenId Minted token ID
     */
    function mintTo(address to, string calldata tokenURI) external returns (uint256) {
        require(msg.sender == admin || msg.sender == owner(), "only admin");
        require(to != address(0), "zero address");
        
        uint256 tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        emit Minted(to, tokenId, tokenURI);
        return tokenId;
    }

    /**
     * @notice Set admin address (for relayer or marketplace)
     */
    function setAdmin(address _admin) external onlyOwner {
        require(_admin != address(0), "zero address");
        admin = _admin;
    }
}

