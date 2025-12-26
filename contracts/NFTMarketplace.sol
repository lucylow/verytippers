// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NFTMarketplace - Marketplace for NFT trading
 * @dev Handles listing, cancellation, and purchase of NFTs
 */
contract NFTMarketplace is ReentrancyGuard, Ownable {
    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price; // price in wei of native token
        bool active;
    }

    mapping(uint256 => Listing) public listings; // listingId => Listing
    uint256 public nextListingId;
    
    // Platform fee (basis points, e.g., 250 = 2.5%)
    uint256 public platformFeeBps = 250; // 2.5% default
    address public feeRecipient;

    event Listed(uint256 indexed listingId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 price);
    event Cancelled(uint256 indexed listingId);
    event Purchased(uint256 indexed listingId, address indexed buyer, uint256 price);

    error InvalidPrice();
    error NotActive();
    error NotSeller();
    error PaymentFailed();
    error TransferFailed();

    constructor() Ownable(msg.sender) {
        nextListingId = 1;
        feeRecipient = msg.sender;
    }

    /**
     * @notice List NFT for sale
     * @param nftContract NFT contract address
     * @param tokenId Token ID to list
     * @param price Price in wei
     * @return listingId Created listing ID
     */
    function listItem(address nftContract, uint256 tokenId, uint256 price) external nonReentrant returns (uint256) {
        if (price == 0) revert InvalidPrice();
        
        // Transfer NFT into escrow
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        uint256 lid = nextListingId++;
        listings[lid] = Listing({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            active: true
        });

        emit Listed(lid, msg.sender, nftContract, tokenId, price);
        return lid;
    }

    /**
     * @notice Cancel active listing
     * @param listingId Listing ID to cancel
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage l = listings[listingId];
        if (!l.active) revert NotActive();
        if (l.seller != msg.sender) revert NotSeller();
        
        l.active = false;
        IERC721(l.nftContract).transferFrom(address(this), l.seller, l.tokenId);
        emit Cancelled(listingId);
    }

    /**
     * @notice Purchase listed NFT
     * @param listingId Listing ID to purchase
     */
    function buy(uint256 listingId) external payable nonReentrant {
        Listing storage l = listings[listingId];
        if (!l.active) revert NotActive();
        if (msg.value != l.price) revert InvalidPrice();
        
        l.active = false;

        // Calculate platform fee
        uint256 feeAmount = (l.price * platformFeeBps) / 10000;
        uint256 sellerAmount = l.price - feeAmount;

        // Forward payment to seller
        (bool sellerOk,) = payable(l.seller).call{value: sellerAmount}("");
        if (!sellerOk) revert PaymentFailed();

        // Forward fee to platform
        if (feeAmount > 0) {
            (bool feeOk,) = payable(feeRecipient).call{value: feeAmount}("");
            if (!feeOk) revert PaymentFailed();
        }

        // Transfer NFT to buyer
        IERC721(l.nftContract).transferFrom(address(this), msg.sender, l.tokenId);
        emit Purchased(listingId, msg.sender, l.price);
    }

    /**
     * @notice Set platform fee (owner only)
     * @param feeBps Fee in basis points (10000 = 100%)
     */
    function setPlatformFee(uint256 feeBps) external onlyOwner {
        require(feeBps <= 1000, "fee too high"); // Max 10%
        platformFeeBps = feeBps;
    }

    /**
     * @notice Set fee recipient address (owner only)
     */
    function setFeeRecipient(address recipient) external onlyOwner {
        require(recipient != address(0), "zero address");
        feeRecipient = recipient;
    }

    /**
     * @notice Get listing details
     */
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }
}

