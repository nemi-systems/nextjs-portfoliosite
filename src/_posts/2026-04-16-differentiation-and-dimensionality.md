---
title: "To Tell Things Apart, You Need Somewhere to Put Them"
date: 2026-04-16
coverImage: /assets/differentiation-and-dimensionality/ai_img_chatgpt_avatar.png
---

## The identical twin problem

![Two identical silhouettes in a forensic line-up, separated by a new orthogonal axis carrying a single freckle](/assets/differentiation-and-dimensionality/ai_img_chatgpt_hero.png)

Look at two identical twins. You cannot tell them apart from a photograph alone — whatever features you're using (eye color, jaw shape, hair) return the same values for both. They collide in your representation. To distinguish them, you have to find some way their representation *can* differ: a freckle, a gesture, a voice, a fingerprint. You have to reshape the space in which you're trying to tell them apart.

This is what differentiation is, underneath the word: **the act of locating things in a space of features such that they occupy distinct positions.** If two things collide — if every coordinate you've assigned them is the same — then in the space you've built, they are, for your purposes, the same thing. To pull them apart, you need a different space: more axes, or finer resolution along the axes you have, or a different way of measuring distance along them, or a transformation that folds the representation into a new geometry.

This essay is about how that works. The descriptive claim underneath it: distinction depends on the structure of the representation, not on dimensionality alone. Dimensions matter because they expand the forms of separability available to us — but so do resolution, metric, transformations, and data. High-dimensional settings are difficult not because dimension is always the enemy, but because expressive freedom increases faster than our ability to tell meaningful structure from accidental separation.

## What differentiation is

Start modest.

> **Differentiation is the act of assigning distinct positions to observations within a representational space.**

That's the whole definition. Nothing about relevance. Nothing about exploitation. Nothing about which differences deserve to count. Just: putting things somewhere, such that they occupy different somewheres.

This modesty matters, because the interesting claims about differentiation are claims that definition alone cannot deliver. Whether the positions you've assigned correspond to anything in the world, whether the distinctions you've drawn will hold up under new data, whether the axes you've chosen are the ones the problem actually turns on — none of this is built into the act of placement itself. These are findings, not tautologies. A representation can differentiate fluently and be wrong about everything.

The naive view is that differentiation is a property of the things. *These two items are different;* the representation merely records it. But two things are never simply different — they are different *along some axes* and identical *along others*, and which axes you've made available is a choice. Distinction is an operation performed by an observer with a representational space, and the space is prior to the distinction.

This puts a particular question at the center of the essay:

> Given that distinction happens in the map, what makes a map good at it?

The answer is not "more dimensions." It is not "finer resolution." It is not any single lever. It is the coordinated structure of the representation — its dimensions, its resolution, its metric, its transformations, and the data that populates it — tuned to the distinctions the task requires. High-dimensional learning is difficult not because dimension is the enemy but because representational freedom grows faster than our ability to tell which distinctions are real.

That last sentence is the thesis. Everything that follows is an attempt to unpack what it means and what it implies.

## Map, territory, and the space in between

![Overhead view of a cartographer's desk with three acetate overlays — subway topology, topographic elevation, sparse feature points — of one underlying terrain](/assets/differentiation-and-dimensionality/ai_img_chatgpt_cartographer_desk.png)

Bateson's line — *the map is not the territory* — is often read as a warning against confusing models with reality. But there is a second reading, closer to what Korzybski originally meant and what Heidegger circled around in his talk of the *clearing*: a map is a choice about which dimensions of the territory to preserve. A subway map collapses geography to topology; a topographic map collapses cultural features to elevation. Each map is a projection, and every projection is a decision about what differences are allowed to register and what differences are permitted to collapse.

Differentiation happens in the map, not the territory. The territory just *is*; it doesn't distinguish anything. Hermeneutically, this is why interpretation is never finished — any reading preserves some differences and collapses others, and another reading, with different axes, can always pull apart what yours ran together.

For the ML-minded reader, this is the embedding problem stated philosophically. An embedding is a map. "King" and "queen" occupy nearby positions along most axes and differ sharply on one. Whether a given embedding is *good* depends on whether the differences that matter for your task are preserved as distances in the space. When a model confuses two things, the fix is rarely more training data along the axes where they already look alike. The fix is a representation in which they differ — and that may mean a new axis, or a new metric, or a new transformation of the space you already have.

## Climbing the dimensions

![Isometric cutaway of an observatory tower with five stacked floors — scalar rail, scatterplot atrium, wire-frame cube room, time-slice corridor, folded manifold vault](/assets/differentiation-and-dimensionality/ai_img_chatgpt_dimension_tower.png)

Each step up the dimensional ladder opens a new *kind* of distinction — not just more room, but a different shape of separability. Walking the first few rungs is worth doing even if the high rungs are where the interesting representations live, because the shape of the move is what generalizes.

**1D.** On a single axis, distinction collapses to *more* or *less*. You can rank; you cannot cluster. Temperature alone distinguishes hot days from cold, but not humid-hot from dry-hot. Every distinction is a threshold, and every question is whether a value falls on one side of it or the other. It's the regime of scalar rules and monotonic relationships, and it's as minimal as representation gets while still being a representation.

**2D.** Add an axis and you get regions. Now two points can be close on one dimension and far on the other, which is where clusters become possible and quadrants become meaningful. The political compass works (to the degree it works) because two axes pull apart what one axis collapses: "left vs. right" runs libertarian-left and authoritarian-left onto the same point, and 2D separates them. The scatterplot is the natural home of the 2D mind, and the fact that it is a plot — a thing you can *look at* — is part of why 2D reasoning feels so tractable.

**3D.** Now you have volume, and with it the possibility that two things close on two axes are far on the third. A city is legible in 3D: streets, avenues, floors. Most of the diagrams we draw to explain higher-dimensional things are 3D projections, because 3D is the ceiling of comfortable visualization. This is the last regime where the representation and the human visual system are playing the same game.

**4D.** Add another axis — time is the canonical one — and something changes qualitatively: you can no longer see the whole thing at once. You have to *traverse* it. A trajectory through a 3D space is a 4D object. Einstein's great move was to insist that space and time are a single 4D manifold, and the cost of that insight is that no human being has ever visualized spacetime — we only ever look at slices and projections of it. Music lives in 4D: pitch, timbre, dynamics, and time. So does a conversation.

**Higher.** Past four, visualization doesn't just strain — it stops being the right tool. And this is where the usual story turns ominous: *distances concentrate, neighborhoods become strange, intuition abandons you.* That story isn't wrong, but it's incomplete, and taking it as the whole picture is what leaves people surprised that modern representation learning works at all.

Here is the more honest picture. High-dimensional spaces are hard to *see* but not necessarily hard to *work in*. A face-recognition embedding of 512 dimensions distinguishes billions of faces reliably. A language model's internal state at a single token runs $10^3$ to $10^4$ dimensions and supports distinctions too fine to name. These systems don't succeed by conquering the curse of dimensionality through sheer computation. They succeed because the representations they learn are structured — because the intrinsic dimension of the meaningful variation is far lower than the ambient dimension of the space, and the structure concentrates the expressive power onto the axes that matter.

The shift at high D is not a shift into opacity. It is a shift from *visualization* to *structure* as the thing doing the work. In low dimensions, you can see the distinctions. In moderate dimensions, you have to coordinate them. In high dimensions, the distinctions are carried by the geometry of the learned representation — by how the manifold folds, which directions are compressed, which are preserved, what the metric treats as close. You don't look at a 4000-dimensional embedding and understand it. You probe it, project it, measure distances within it, and trust that the structure you cannot see is doing the work that visualization used to do at lower rungs.

This is why the old "curse of dimensionality" framing misleads. The curse is real if you bring low-dimensional intuitions into a high-dimensional space and expect them to work — of course nearest-neighbors behave strangely when every point is nearly equidistant from every other. But the systems that succeed in high dimensions don't rely on those intuitions. They build structure instead, and the structure is what makes distinction tractable. The ambient count is not the operative variable at high D. The organization of the space is.

So the climb is not a walk from the tractable into the intractable. It is a walk across regimes, each of which calls for a different way of carrying distinction — thresholds at 1D, regions at 2D, volumes at 3D, trajectories at 4D, and *learned structure* at everything above. The shift at the top of the ladder is a shift in what the representation has to do for you, not a shift into opacity.

## The math, as a floor

There is a simple inequality at the bottom of all of this.

If you have $N$ things to distinguish, and a representation with $d$ dimensions each carrying $r$ distinguishable levels of resolution, the space holds $r^d$ distinct positions. For differentiation to be *possible at all*, you need:

$$
r^d \geq N
$$

Taking logs:

$$
d \cdot \log_2(r) \geq \log_2(N)
$$

The left side is the bits of representational capacity you've built. The right side is the bits of distinction the task requires. The inequality says only that the first must exceed the second — that you cannot distinguish a million things in a space that holds only a thousand positions.

Two things are worth saying about this, and then one thing worth not saying.

**First, adding a dimension is multiplicative.** Each new axis multiplies the size of the representable space by $r$. This is why dimension is such a powerful lever when it's the right lever: one more axis doesn't add capacity, it compounds it.

**Second, adding resolution is also multiplicative, but only along one axis.** Doubling the resolution of a single dimension doubles the space. Doubling the resolution of every dimension is equivalent to adding $d$ bits total — which at high $d$ is a much bigger move than adding a single new axis. When dimensions are fixed and resolution is tunable, this is where the expressive power comes from. It's also why one-hot encoding feels so wasteful: you're paying for many dimensions at the lowest possible resolution ($r = 2$), when a single continuous axis at moderate resolution would do the same work.

**And now the thing not to say.** This inequality is a *floor*, not a model. It tells you the minimum representational budget below which differentiation is simply impossible. It tells you nothing about whether a representation with sufficient capacity will actually distinguish the things you care about. A space of $r^d$ positions is a space of $r^d$ possible placements — it doesn't tell you which placements are meaningful, which are accidental, or which correspond to structure in the world. That question lives above the floor, in the territory the inequality cannot reach.

This is why most of the action in representation design happens after the capacity question is settled. Modern neural networks work in spaces vastly larger than their tasks require — the ambient capacity is effectively never the binding constraint. What binds is whether the representation concentrates its expressiveness on the intrinsic structure of the problem, or spreads it across axes that carve the space for no reason. The inequality is silent on that question. It has to be.

Think of $r^d \geq N$ as the condition for differentiation to be *possible*. Everything else in this essay — ambient versus intrinsic, the five levers, the difference between expressive freedom and grounded distinction — is the condition for differentiation to be *meaningful*. The first is easy to satisfy. The second is most of the work.

## Ambient and intrinsic: the space you built vs. the space that matters

![A vast cathedral-scale warehouse of empty scaffolding with a solitary figure holding a thin luminous ribbon-thread winding through a narrow corridor of the space](/assets/differentiation-and-dimensionality/ai_img_chatgpt_empty_warehouse.png)

A representation has two dimensionalities, and they are almost never the same.

The **ambient dimension** is the one you can count. It's the length of the vector, the number of columns in the table, the size of the coordinate system you chose. A photograph at 1024×1024 pixels has an ambient dimension of about a million. A word embedding declared as $\mathbb{R}^{300}$ has an ambient dimension of 300. Ambient dimension is a property of the *container*.

The **intrinsic dimension** is the one that's actually doing work. It's the number of independent directions along which the data meaningfully varies. The million-pixel photographs of human faces do not fill a million-dimensional space; they cluster near a manifold of far lower dimension, because most pixel configurations are not faces. The 300-dimensional word embedding may have an intrinsic dimension closer to 30 or 50 — the rest is slack. Intrinsic dimension is a property of the *content*.

The gap between them is where the trouble lives.

When the ambient dimension exceeds the intrinsic dimension — which it almost always does — the difference is room. Room to place things. Room to separate them. Room, crucially, to separate them *for no reason*. In a space with many more axes than the data needs, you can almost always find a hyperplane that carves your points apart; the question is whether that separation means anything. This is where spurious distinction lives: in the expressive capacity that the task doesn't require but the representation nonetheless offers.

This reframes what high-dimensional difficulty actually is. It is not that distinguishing things becomes harder as ambient dimension grows — in many cases it becomes combinatorially easier. It is that distinguishing *meaningfully* becomes harder, because the ratio of available-but-accidental separations to available-and-real separations grows with the gap between ambient and intrinsic.

Most of what modern machine learning does, when it works, is close this gap from the inside. A trained embedding takes an ambient space of thousands of dimensions and organizes it so that variation along the intrinsic directions dominates. The extra ambient dimensions don't go away — they just stop mattering. A good representation is one in which the ambient dimension is high enough to hold the distinctions you need but structured so that most of it isn't available for accidental carving.

This is why the question "is high-dimensional learning hard?" doesn't have a single answer. A dataset in $\mathbb{R}^{1000}$ with intrinsic dimension 3 is, in an important sense, a three-dimensional problem wearing a costume. A dataset in $\mathbb{R}^{1000}$ with intrinsic dimension 800 is a genuinely thousand-dimensional problem, and it is hard not because of the ambient count but because there is that much real structure to recover.

Which is why dimension, on its own, is the wrong lever to reach for first — and why the real question is which lever the situation calls for.

## The levers

![A draughtsman's pegboard wall holding five instruments — a T-square extender, divider-comb caliper, warped French curve, origami crease template, and glass ink reservoir of sample dots](/assets/differentiation-and-dimensionality/ai_img_chatgpt_instrument_wall.png)

When two things collide in your representation — when the coordinates you've assigned them are the same — you have more options than the twins example might suggest. *Add a dimension* is the most intuitive, but it's one of five levers, and often not the one you should reach for first.

**Add a dimension.** Introduce a new axis along which the colliding things differ. This is the twin-with-a-freckle move: the original representation had nothing to say about freckles, and now it does. It's the most expensive lever in most settings — new axes cost measurement, annotation, or engineering — but it's also the most structurally direct. When two things genuinely share every coordinate in your current space, nothing else will separate them.

**Refine resolution.** Keep the axes you have but measure along them more finely. A thermometer that reads to the nearest degree collapses 98.3°F and 98.7°F to the same value; a thermometer that reads to the nearest tenth doesn't. Resolution is cheaper than dimension when the dimension is already the right one. It's more expensive when it isn't — no amount of finer temperature measurement will tell you whether a fever is viral or bacterial.

**Change the metric.** Keep the space and the resolution but change what counts as "close." Two points can be neighbors under Euclidean distance and strangers under cosine similarity; the space hasn't changed, but the topology of distinction has. Attention mechanisms, learned distance functions, and Mahalanobis-style reweightings are all versions of this move. The coordinates stay; the relationships between them shift.

![A solitary figure on a taut gridded rubber sheet, holding a heavy sphere that drags the grid into an anisotropic well so two identical-coordinate pin-points fall on far-apart iso-distance rings](/assets/differentiation-and-dimensionality/ai_img_chatgpt_rubber_sheet.png)

**Transform nonlinearly.** Reparameterize the space so that points which collided under the old coordinates separate under the new ones. This is the kernel trick, and more generally what every hidden layer of a neural network is doing: folding the representation so that previously indistinguishable inputs land in different places. No dimensions are added in the honest accounting — the transformation is a map from the space to itself, or from one space to another of similar size — but the geometry of what can be linearly separated changes completely.

![Draughtsman hands creasing a flat paper sheet printed with two tangled spirals into a saddle fold, so the spirals stand on opposite faces and separate along a single slice](/assets/differentiation-and-dimensionality/ai_img_chatgpt_origami_fold.png)

**Gather more data.** The other four levers change the representation. This one leaves the representation alone and improves your estimates within it. If the axes are right and the metric is right but the data is noisy, more samples will sharpen the distinctions that are already latent. If the axes are wrong, more data won't help — and this is the case where the confusion about "do I need more data or more dimensions?" genuinely bites. The answer depends on whether the collision is statistical or structural.

Each lever has a regime where it dominates. Dimension is right when the axes you have are genuinely missing a degree of freedom the problem requires. Resolution is right when the axes are correct but too coarse. Metric is right when the axes and resolution are fine but the wrong things are being treated as close. Transformation is right when the linear structure of the space is wrong for the task. Data is right when everything else is right but the estimates are noisy.

Most real failures of differentiation are failures to diagnose which lever the situation calls for. People reach for more data when they need a new axis. They add axes when they needed to change the metric. They tune metrics when the transformation is what needed to change. The twins example is memorable because the answer is obviously "new axis" — but that clarity is rare, and treating it as the general shape of the problem misleads as often as it guides.

The more honest rule is the one this essay has been building toward: when two things keep colliding, the fix is representational, but the representation has more than one dial. Knowing which dial to turn is most of the work.

## Dimensionality Numbers Every Modeler Should Know

This is a floor, not a forecast. It tells you the minimum representational budget needed to assign non-colliding coordinates to $N$ things. Whether those coordinates track anything meaningful is a separate question — the one most of this essay has been about. Read the table as "here is the capacity you need at minimum," not as "here is the dimensionality your problem requires."

| Things to distinguish | Bits required | Dims @ ~10 levels each | Everyday analogue | Representation-flavored analogue |
|---|---|---|---|---|
| 2 | 1 | 1 | on/off, yes/no | a single binary feature |
| ~10 | ~3–4 | 1 | digits, days of the week | a small categorical |
| ~100 | ~7 | 2 | countries, keys on a keyboard | a 2D scatterplot's worth of clusters |
| ~1,000 | ~10 | 3 | active English vocabulary | a modest tag system |
| ~10,000 | ~14 | 4 | an educated vocabulary | small-corpus topic model |
| ~1,000,000 | ~20 | 6 | faces a person can recognize (generous upper bound) | low-dim word embedding |
| ~8 × 10⁹ | ~33 | 10 | every human alive | a compact face-recognition embedding |
| "Effectively unique" | 128+ | 40+ | fingerprints, SHA-256 hashes | cryptographic identity, LLM hidden states |

Notice where the real systems sit. A face-recognition embedding needs about 33 bits to give every human alive a unique coordinate, and uses 128 to 512 dimensions to do it. The gap between the floor and the practice is where the structure lives.

## Rules of thumb

**Every dimension added roughly multiplies distinguishing power; every bit of resolution added to a dimension roughly doubles it.** This is the fundamental tradeoff. Adding an axis is the bigger lever at low dimensions — which is why feature engineering historically beat hyperparameter tuning — but refining resolution and reshaping the metric dominate once the axes are roughly right.

**If two things keep colliding, the problem is representational, and the representation has more than one dial.** A new axis, finer resolution, a different metric, a nonlinear transformation, more data — each is the right answer in some regime and the wrong answer in others. Most of the work in a serious modeling task is diagnosing which lever the situation actually calls for, not pulling whichever lever is most familiar. People reach for more data when they need a new axis; they add axes when they needed to change the metric; they tune metrics when the transformation is what needed to change. Knowing which dial to turn is most of the work.

**Humans reason natively in 2–4 dimensions.** Beyond that, we need tools — tables, projections, models, metaphors — to do the differentiation for us. This is not a deficiency; it's why we built the tools. A spreadsheet is a prosthetic for handling more dimensions than a mind can hold at once. A learned embedding is a prosthetic for handling more than a spreadsheet can.

**Ambient capacity is almost never the binding constraint.** Modern representations run in spaces vastly larger than their tasks require; the question is whether the expressive power is concentrated on the intrinsic structure of the problem or spread across axes that carve the space for no reason. "How many dimensions does this model have?" is a less interesting question than "how many of them are doing work?"

**The curse of dimensionality is the blessing of dimensionality seen from the wrong side.** In high dimensions, distances concentrate and neighborhoods become strange — but there is also so much room that almost any two distinct things can be assigned non-colliding coordinates. Modern ML lives off the blessing and pays for the curse with regularization, normalization, and structure-imposing tricks like attention that let models pick which dimensions matter locally.

**The test of a representation is not what it can separate but what it can separate *for a reason*.** Spurious separability is free in high dimensions; meaningful separability is not. Everything the field calls "inductive bias" — priors, regularization, architecture, pretraining — is ultimately an attempt to ensure that the distinctions a representation draws track something in the world rather than something in the representation itself.

## Coda: the clearing

To tell two things apart, you must first have a space in which they can be apart. Differentiation is not a discovery about the things; it is a property of the representation you're using to perceive them. The territory holds no distinctions of its own. The map is where things become two.

But the map has more than one dial. It has dimensions, and resolution within those dimensions, and a metric that decides what counts as close, and transformations that fold the space into new geometries, and data that populates it more or less densely. The work of distinction is the work of tuning these together — not adding axes for their own sake, not gathering data for its own sake, but coordinating the levers so that the distinctions the representation can draw are the ones the world supports.

This is why the task of thinking — in science, in interpretation, in perception, in the attempt to understand another person — is so often a search for the right representation rather than more effort within the wrong one. Not more data along the axis where two things already look alike. Not more force on a metric that was never going to separate them. A reshaping of the space itself, until the collision finally resolves — and then the harder second question, which the representation cannot answer from the inside: whether the distinction you've drawn is one the world will honor back.
