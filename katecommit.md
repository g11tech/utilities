# Kate commitments in ![](https://i.imgur.com/WcqsJ99.png)ETH 
An engineering and implementation prespective

*Disclaimer*: this document just collates, links and include work published across many articles and contributions. the respective credits (including of images extracted from these links) goes to the respective authors/developers of the work.


*ps*: Special thanks goes to **[Ethereum R & D discord](https://discord.gg/2sBGYZtv)** (especially to @vbuterin and @piper ) for helping understand some of the aspects of Kate.

*pps*: This document was developed for the benefit of 🌟 [lodestar](https://github.com/ChainSafe/lodestar) team, an awesome ETH POS client in works based on typescript enabling *ETH everywhere*, but also to enable the author's understanding of the ETH ecosystem and innovations.
Hopefully this will benefit other developers/techies from all around the world. All rights of this work waived through [CC0](https://creativecommons.org/publicdomain/zero/1.0/)
## Motivation
A wholesome guide to familiarize, summarize and provide pointers to deep dive into proposed used of **Kate Commitments** while staying in  **[ethereum](https://coinmarketcap.com/currencies/ethereum/)**'s context.
Aim of the document is more summarization and less rigour, but **please follow the links** as they explain in detail what is being talked about.

## Some Basics

##### Note-1: Hash is just a commitment to the value being hashed, proof is checking the integrity of Hash w.r.t data.
For e.g. `h1=H(t1,t2,t3..)`, and give `h1` to the verifier (for e.g. in a block header), and then give a tempered block `(t1,t2',t3...)`, one would be able to fast calculate the integrity of the block and reject it as the tempered block.


Similarly *root* of a *[merkel tree](https://en.wikipedia.org/wiki/Merkle_tree)* is a **commitment** to the leaves and their indexes (paths), or in short to the map of `indexes => values`. 
![](https://i.imgur.com/yfUVL86.png)

*[Proof](https://medium.com/crypto-0-nite/merkle-proofs-explained-6dd429623dc5)* here is the *merkel branch* and its *sibling hashes* which can be used to check the consistency all the way to the *merkel root*. 
![](https://i.imgur.com/v0qFAx0.png)


[Trie it out here](https://github.com/ftruzzi/ethereum-learning-notes/blob/master/01-understanding-the-trie.md):wink:.

##### Note-2: correspondance between a data map and a polynomial
The map of `indexes => values` can be represented as a [polynomial](https://en.wikipedia.org/wiki/Polynomial) `f(x)` which takes the value `f(index)=value` courtesy of [Langrange Interpolation ](https://en.wikipedia.org/wiki/Lagrange_polynomial)
![](https://i.imgur.com/zttn0WD.png)

For optimizations, and for one to one mapping between polynomial and data map, instead of just `index` as `x` in `f(x)`, `w^index` is used i.e. `f(w^index)=value` where `w` is the `d`th [root of unity](https://en.wikipedia.org/wiki/Root_of_unity) where `d` is the degree of the polynomial (the maximum index value we are trying to represent), so that [FFT](https://vitalik.ca/general/2019/05/12/fft.html) can be deployed for efficient polynomial operations like multiplication and division which are of the `O(d)` in evaluation form and can be converted back into *coefficient form* in `O(d*log(d))`. So its still beneficial to keep `d` small.
![](https://i.imgur.com/AdtiDuL.png)


##### Note-2.1: Ethereum's state is a map from `addresses => (version,balance,nonce,codeHash,storageRoot)`
![](https://i.imgur.com/TaKFUVU.png)



## Background

Ethereum currently use merkel trees and  more specifically [patricia merkel tries](https://blog.ethereum.org/2015/11/15/merkling-in-ethereum/) to commit to [EVM data](https://www.lucassaldanha.com/content/images/2018/12/summary-final.png) (EVM state, block transactions or transaction recepits and may be in near future contract code as well) , that can be

* inserted/updated block by block to arrive at the new root hash(commitment) in an incremental way
* inspected and proved block by block (or even transaction by transaction) by the  verifier

`Trie` structure here gives that piece by piece capability.
![](https://i.imgur.com/vDYAUgz.png)



Given a large `d`-ary trie with size `N` leaves, any leaf change will take `O(log-d(N))` nodes updation (all the way to the root) to compute the new `root` reflecting new state, which requires additonal `(d-1)*O(log-d(N))` sibling nodes Hashes/Commitments as witnesses for both time (and space if light clients are to be served). In a block, which is a batched update of lets say `m` random leaf updates where `m<<N`, only a very small percentage of nodes will be expected to share the witnesses and computations and hence the update `Order` wouldn't change much for per update.


This problem is compounded even further (because of size of the witness data) in following scenarios:
* a partly fast sync protocol like *beam sync* which can download and fast verify blockheaders to arrive to the latest canonical head of the chain (without building the state) and start partipiating in the network concensus while incrementally building its state by fetching witnesses of missed/not yet loaded state.
* to serve *light nodes* who only wants to concern themselves with a particular sliced view of the blockchain.
* going full stateless any transactions or contract operations will bundle their own witnesses to prove the correctness of the data input as well as output.
* blockchain sharding where the validators are shuffled between various shards and it would not be feasible to construct full state.
* code merkelization where accessing code segments will need to bundle witnesses for those code chunks
* state expiry protocols where state witnesses for an address would need to be rebundeled to resurrect the state of an account.

In an experiment on [stateless ethereum](https://medium.com/@akhounov/data-from-the-ethereum-stateless-prototype-8c69479c8abc), the block proof sizes of *1MB* were observed (of which majority of them were *merkel proofs*), which would even blow up in multiples in times of an attack.
![](https://i.imgur.com/ylCWXGx.png)


One way to get around this is [binary merkel trees](https://medium.com/@mandrigin/stateless-ethereum-binary-tries-experiment-b2c035497768) taking `d` out of the picture but then the depth of tree would increase but it would still remain `O log(N)`

![](https://i.imgur.com/bxYP0Fg.jpg)


## Why Kate?
Following properties are desirable for any [ideal commitment scheme](https://ethresear.ch/t/open-problem-ideal-vector-commitment/7421) to have for commiting to data in the block headers
1. A small size (48 bytes) that can easily fit into block header but still has strong security guarantees.
2. Easy to prove that commitment was created using a subset of chunkified data
3. Very small and ideally constant proof size
4. For tracking state it should be easy to make changes (to index=>value map) in an incremental way

[Kate commitment](https://www.iacr.org/archive/asiacrypt2010/6477178/6477178.pdf) based constructions are the result of search of pursuing such an ideal scheme. Vanilla Kate excel at first three.
![](https://i.imgur.com/JmxZSj1.png)


## What is Kate
[Kate commitment]((https://www.iacr.org/archive/asiacrypt2010/6477178/6477178.pdf)) as such is just another Hashing scheme, but it doesn't Hash 'bytes', it hashes polynomials. 



It actually is the *evaluation* of the polynomical `f(x)` on an [elliptical curve](https://blog.cloudflare.com/a-relatively-easy-to-understand-primer-on-elliptic-curve-cryptography/) at a secret (fixed) `[s]` point on the curve i.e. `f([s])` which sort of requires a trusted setup party of the sorts of zcash genesis to generate `[s]`  `[s^2]` ... `[s^d]` (to plug into the polynomial wherever there is `x^i`) where `d` is the max degree we would deal in. 

![](https://i.imgur.com/fQsIP0E.gif)


Here notation `[t]` means elliptical curve at point `t` which is basically `t[1]` i.e. generator `[1]` of the additive group on the elliptical curve added `t` times (`modulo Fp`).  All operations on the curves are some `modulo Fp` where `Fp` imposes some *field* on the curve.
![](https://i.imgur.com/v7eUSTH.gif)

##### Note3.1: `[t]` can be treated as Hash of `t` as obtaining t from `[t]` is *discreet log problem* known to be intractable for secure curves.

##### Note3.2: `s` is a secret and should be unknown forever to all/any but elliptical curve points `[s]`, `[s^2]`...`[s^d]` as well as evaluation on another curve `[s]'` (whose generator is `[1]'`, only `[s]'` is required) are generated, known, shared and public at trusted setup time, and are sort of *system parameters*.

As mentioned before, we represent our data map (`index=>value`) as `f(w^index)=value` i.e.  *evaluation form* of the polynomial (or in other words we *fitted* a polynomial here on these `(w^index,value)` points).
So Kate commitment is just another evaluated point  `f(s)` on the elliptical curve i.e. `[f(s)]=f([s])` i.e. can be computed by plugging  `[s]`,`[s^2]` ... into expanded form of `f(x)`.

So whats the good thing about this: 
* [Verification of the commitment](https://dankradfeist.de/ethereum/2020/06/16/kate-polynomial-commitments.html) can be done by providing another evaluation (provided by the block generator) `y=f(r)`  of the underlying polynomial at a **random** point `r` and  evaluation of the quotient polynomial `q(x)=(f(x)-y)/(x-r))` at `[s]` i.e. `q([s])`  and comparing with the previously provided commitment `f([s])` using a *[pairing equation](https://vitalik.ca/general/2017/01/14/exploring_ecp.html)* (which is just a multiplication scheme for two points on curve) 
This is called *opening* the commitment at `r`, and `q([s])` is the *proof*. one can easily see that `q(s)` is intutively the quotient of `p(s)-r` divided by `s-r` which is exactly what we check using the [pairing equation] i.e. check `(f([s])-[y]) * [1]'= q([s]) * [s-r]'`
* In non interactive and deterministic version [Fiat Shamir Heuristic](https://en.wikipedia.org/wiki/Fiat%E2%80%93Shamir_heuristic) provides a way for us to get that relative **random** point `r` as randomness only matters with respect to inputs we are trying to prove. i.e. once commitment `C=f([s])` has been provided, `r` can be obtained by hashing all *inputs* (`r=Hash(C,..)`), where the *commitment provider* has to provide the *opening* and *proof*. 
* As you can see [here](https://notes.ethereum.org/nrQqhVpQRi6acQckwm1Ryg?view), `f([s])`,`q([s])` can be directly computed from the *evaluation form*. To compute an *opening* at `r`, you would convert the `f(x)` to *coefficient form* `f(x)=a0+ a1*x^1....` (i.e. extract `a0`,`a1`,...) by doing the *inverse FFT* which is `O(d log d)`, but even there is a [substitue algorithm available](https://ethresear.ch/t/kate-commitments-from-the-lagrange-basis-without-ffts/6950/6) to do it in `O(d)` without applying (inverse)`FFT`.
* You can prove multiple evalutions of `f(x)` at their respective `index`s, i.e. multiple `index=>value` data points using the single *opening* and *proof*, using a technique called *exponentiation*. This can be used to compress the proof of a *trie branch (sort of analogous to merkel branch*, check [verkel tries segment](https://hackmd.io/yqfI6OPlRZizv9yPaD-8IQ?both#Verkel-tries) ) in a single *proof* element.
* In the sharded setup of the POS chain where the sharded data blobs will be represeted as a low degree polynomial (and extended for *erasure coding* into twice its size using the same *fitted* polynomial), the Kate commitment can be checked against *randomly sampled* chunks to validate and establish *availabily*

Now, for a state with possible `2^28` accounts, you would require a `2^28` degree polynomial for just a *flat* commitment construction. And any change in any one of those accounts will trigger the computation of the base commitment. Hence for the 4rth point of [ideal commitment](https://hackmd.io/yqfI6OPlRZizv9yPaD-8IQ?both#Why-Kate) we need a special construction which is similar to *merkel trees* but instead of ` o ((d-1) * log-d(N))` we will be doing better at `O( log-d(N) )` ridding ourselves from `(d-1)` factor.

## Verkel tries

The ethereum state that needs to be represented is `2^28 ~= 16^7 ~= 250m` size `indexes=> values` map (possible accounts). If we just build a flat commitment using all of these indexes in one go, `d` we would need will be ~`2^28` and then despite our proof still being `constant order` of the size of `elliptical curve element` of 48 bytes, any tree compute or update will require full commitment calculation. Hence we need to move away from a flat structure to something called *[Verkel Trees](https://notes.ethereum.org/_N1mutVERDKtqGIEYc-Flw)* which you will notice is also a [trie](https://en.wikipedia.org/wiki/Trie) like its *merkel* counterpart.

![](https://i.imgur.com/2nHMrfm.png)

i.e. Build a commitment tree in same way as merkel, where we can keep `d` low at each node of the tree (but can still go as high as ~`256` or `1024`).
* Each parent is the commitment that encodes the commitment of their children as children are a map of `index => child values` where `index` is the child's `index` at that particular parent node. 
* Actually the parent's commitment encode the Hashed child nodes as the input to the commitment is  standarized `32` bytes size values. 
* The leaves encode the commitment to thee chunk of hashed `32` byte data that those leaves store.
* to provide the proof of a branch (analogous to merkel branch proofs), a [multi-proof commitment](https://notes.ethereum.org/nrQqhVpQRi6acQckwm1Ryg) `D` can be generated along with its opening at point *relatively random* point `t` using fiat shamir heruristic.




### Verkel Trees Construction Scenarios

#### Proposed [ETH State Verkel Tree](https://ethereum-magicians.org/t/proposed-verkle-tree-scheme-for-ethereum-state/5805)
A single trie structure  for account *header*, *code chunks* as well as *storage chunks* with node commitments of degree `d=256` polys
* combines address and header/storage slot to derive a 32 bytes `storageKey` which essentially is a representation of the tuple `(address,sub_key,leaf_key)`
* First 30 bytes of the derived key are used for normal verkel tree node pivots constructed
* Last 2 bytes are depth-2 subtrees to represent maximum `65536` chunks of `32` bytes
* For basic data, the dept-2 subtree has maximum *4* leaf commitments to cover header + code
* For storage a chunk of `65536*32` bytes is represented as a single depth-2 subtree, there can be many such subtrees in the main trie for storage of an account.
* Proposed [GAS schedule](https://notes.ethereum.org/@vbuterin/witness_gas_cost_2)
    * access events of the type `(address, sub_key, leaf_key)`
    * `WITNESS_CHUNK_COST` for every unique access event
    * additonal `WITNESS_BRANCH_COST` for every unique `address,sub_key` combination
#### Code merkalization 
Code will automatically become part of verkel trees as the part of unified state tree. 
* header and code of a block are all part of a single depth-2 commitment tree
* at max 4 witnesses for chunks with `WITNESS_CHUNK_COST` and one main `WITNESS_BRANCH_COST` for accessing account.

### Updates to Verkel trees
TBD
hint: once we get the nodes to be updated in a verkel tree (by following updated leaves to the root and marking the nodes), we can update the commitments there by using **difference polynomials**


## Data sampling and sharding in POS protocol
One of the goals of ETH POS is to enable to commit ~1.5MB/s of data (think this throughput as the state change throughput and hence transaction throughput that layer 2 rollups can use and eventually layer 1 EVM) into the chain. To achieve this, many parallel proposals will be done and verified at any given *~`12` second slot*, and hence multiple (`~64`) *data shards* will exists, each publising its own *shard blob* every slot. *Beacon block* will include the *shard blobs* which have `>2/3` voting support, and the *fork choice rule* will determine if the *beacon block* is canonical based on the **availability** of all the blobs on that *beacon block and its ancestors*.
##### Note-3: shards are not chains here, any implied order will need to be *interpreted* by layer 2 protocols 

Kate commitment can be used to create [data validity and  availability scheme](https://hackmd.io/@vbuterin/sharding_proposal) without  clients accesing full data published across shards by the shard proposer.
![](https://i.imgur.com/hIMRX86.png)

* Shard blob (without erasure coding) is `16384` (`32 byte`) samples `~512kB` with the shard header comprising mainly of corresponding max *`16384` degree polynomial commitment* to these samples
    * But the domain `D` of the evaluation representation of polynomial is `2*16384` size i.e. `1`,`w^1`,...`w^`,... `w^32767` where `w` is the `32768`th `root of unity` and not `16384`.
    * This enables us to *fit* a max `16384` degree polynomial on the data (`f(w^i)=sample-i` for `i<16384`), and then extend(evaluate) it to `32768` places (i.e. evaluate `f(w^16384)` ... `f(w^32767` ) as erasure coding samples
    *  **proofs** of evaluations at each of these points are also calculated and bundeled along with samples
    * Any of the `16384` samples out of `32768` can be used to fully recover `f(x)` and hence the original samples i.e. `f(1)`,`f(w^1)`,`f(w^2)`... `f(w^16383)`
* `2048` *erasure coded* chunks of these `32768` samples (each containing `16` samples i.e. `512 byte` chunks) are published by the *shard proposer* horizontally (`i`th chunk going to 'i'th vertical subnet along with their respective proof), plus globally publishing the `commitment`.
* Each *validator* downloads and checks chunks (and validates with the commitment of the respective blob) across the `k~20` vertical subnets for the assigned `(shard,slot)` to establish `availability guarantees`
    * We need to allocate enough *validators* to a (shard,slot) so that *collaboratively* half (or more) of the data is covered for these with some statistical bounds `~128` committe per `(shard,slot)` out of which `~70+` should attest to *availability and validity* i.e. `2/3` of the committe attesing for successful inclusion of shard blob in the beacon chain.
    * `~262144` validators (`32` slots * `64` shards * `128` minimum committee size)` required





## Benchmarks
As we can see from the [POC verkel go library](https://github.com/gballet/go-verkle) after one time building of `verkel` for the size of state tree, the inserts and updates to `verkel` will be pretty fast.

![](https://i.imgur.com/FuJfsKj.png)
![](https://i.imgur.com/FgGd2Eb.png) ![](https://i.imgur.com/wNZSjmX.png)





---------------------------------------
PS: *this work has not been funded or granted by anyone. if you think this adds value to the ecosystem you could tip the author at: [0xb44ddd63d0e27bb3cd8046478b20c0465058ff04](https://etherscan.io/address/0xb44ddd63d0e27bb3cd8046478b20c0465058ff04)*