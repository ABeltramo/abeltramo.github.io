---
date: 2025-01-27
title: "A modern CRC32 implementation in C++"
description: "constexpr is really powerful!"
---

I needed a CRC32 implemented for [inputtino](https://github.com/games-on-whales/inputtino).  
At first, I've used
`zlib`, but then I wanted to avoid forcing another dependency on users of the library since it's a very
simple method.

I've found a simple C implementation in this [gist](https://gist.github.com/timepp/1f678e200d9e0f2a043a9ec6b3690635)
and a more complex [C++ implementation](https://github.com/eternalharvest/crc32-11) that
unfortunately [doesn't produce the right numbers](https://github.com/eternalharvest/crc32-11/issues/4),
so I've decided to write my own.

```cpp
#include <array>
#include <cstdint>

static constexpr auto generate_table(std::uint32_t polynomial = 0xEDB88320) {
  std::array<std::uint32_t, 256> table{};
  for (std::uint32_t i = 0; i < 256; i++) {
    std::uint32_t c = i;
    for (std::size_t j = 0; j < 8; j++) {
      if (c & 1) {
        c = polynomial ^ (c >> 1);
      } else {
        c >>= 1;
      }
    }
    table[i] = c;
  }
  return table;
}

// Static lookup table generated at compile time
static constexpr auto lookup_table = generate_table();

/**
 * Calculate the CRC32 of a buffer
 */
static constexpr uint32_t CRC32(const unsigned char *buffer, uint32_t length, uint32_t seed = 0) {
  uint32_t c = seed ^ 0xFFFFFFFF;
  for (size_t i = 0; i < length; ++i) {
    c = lookup_table[(c ^ buffer[i]) & 0xFF] ^ (c >> 8);
  }
  return c ^ 0xFFFFFFFF;
}
```

Using `constexpr` we can not only generate the lookup table at compile time but also calculate CRC32 for known values!

Here's an example usage:

```cpp 
std::string buffer = "123456789";
auto crc = CRC32(reinterpret_cast<unsigned char *>(buffer.data()), buffer.length());
REQUIRE(crc == 0xcbf43926); // https://crccalc.com/?crc=123456789&method=CRC-32/ISO-HDLC&datatype=ascii&outtype=hex
```

I quite liked the `iterator` version that the original C++ implementation had, although it doesn't apply to my use case.
Here's a rewritten version of it:

```cpp 
template<uint32_t poly, typename iterator_t>
static inline uint32_t crc32(const iterator_t head, const iterator_t tail, uint32_t seed = 0) {
  static const auto lookup_table = generate_table(poly);
  
  uint32_t c = seed ^ 0xFFFFFFFF;
  c = std::accumulate(head, tail, c, [](uint32_t c, unsigned char byte) {
    return lookup_table[(c ^ byte) & 0xFF] ^ (c >> 8);
  });
  return c ^ 0xFFFFFFFF;
}
```