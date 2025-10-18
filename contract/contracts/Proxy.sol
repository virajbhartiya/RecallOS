// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

/**
 * @title RecallOSProxy
 * @dev This contract implements a transparent upgradeable proxy that is upgradeable by an admin.
 * It is upgradeable because calls are delegated to an implementation address that can be changed.
 * This implementation uses OpenZeppelin's TransparentUpgradeableProxy which provides proper admin functionality.
 */
contract RecallOSProxy is TransparentUpgradeableProxy {
    /**
     * @dev Initializes an upgradeable proxy managed by `_admin`, backed by the implementation at `_logic`, and
     * optionally initialized with `_data` as explained in {TransparentUpgradeableProxy-constructor}.
     */
    constructor(
        address _logic,
        address _admin,
        bytes memory _data
    ) TransparentUpgradeableProxy(_logic, _admin, _data) {}

    /**
     * @dev Returns the current implementation address.
     */
    function implementation() public view virtual returns (address) {
        return _implementation();
    }

    /**
     * @dev Returns the current admin address.
     */
    function admin() public view virtual returns (address) {
        return _proxyAdmin();
    }

    /**
     * @dev Receive function to handle direct ETH transfers.
     */
    receive() external payable {}
}
