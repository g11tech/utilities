ps: this is an iteration over [block access list](https://ethresear.ch/t/block-access-list/9357) with inputs and refinements from @pipermerriam 
#### Background
*EIP [2929](https://eips.ethereum.org/EIPS/eip-2929)/[2930](https://eips.ethereum.org/EIPS/eip-2930)* centers around  normalizing (low) gas costs of data/storage *accesses* made by a transaction  as well as providing  for (and encouraging) a new transaction type format: `0x01 || rlp([chainId, nonce, gasPrice, gasLimit, to, value, data, access_list, yParity, senderR, senderS])`, that makes upfront `access_list` *declarations*, where 
`access_list` is some `[[{20 bytes}, [{32 bytes}...]]...]` a **map** of `accessed_address => accessed_storage_keys`.

The *first accesses* of these upfront *declarations* are charged at discounted price (roughly ~`10%`) and *first accesses* outside this list are charged higher price. Reason is, upfront access declaration provides for a way to *preload/optimize/batch* loading  these locations while executing the transaction.
This inadvertently leads to generation of *transaction* `access_list` that has all *first accesses* (declared or not) made by a transaction. A `JSON-RPC` api endpoint for creating and fetching this list is being standardized. 
#### Motivation
Motivation is to collate these transaction `access_list`s for all the transactions in a **`block_access_list`** document, that can serve as sort of *access index*  in the block to give following benefits:
1. Block execution/validation optimizations/parallelization by enabling construction of *[a partial order](https://en.wikipedia.org/wiki/Partially_ordered_set)* for access and hence execution (hint: *chains* in this *poset* can be parallelized). 
2. Enabling partial inspection and fetching/serving of a block data/state by *light sync* or *fast sync* protocols concerned with a subset of addresses.
3. Possible future extension of this list to serve as index for bundling, serving and fetching witness data for *stateless* protocols.

To serve the above purpose, and prevent any *grieving* attacks, `AccessListRoot` which could be a [urn](https://en.wikipedia.org/wiki/Uniform_Resource_Name) encoding  `Hash/Commitment` of a *canonical construction* of  `block_access_list` as well as the construction type (`merkel/verkel`) will need to be included in the **block header**.
Forming the tree structure (`merkel/verkel`) rather than a simple `hashing/commitment` of the entire *canonical* `block_access_list` will be a bit more expensive, but it will enable partial downloading, inspection and validation of the `block_access_list` as well and is recommended.

#### Construction

