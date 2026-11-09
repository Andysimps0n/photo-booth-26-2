// Photo-taking modes: how many photo cells the strip has in each.
// 'strip' is the classic multi-cut strip; 'mono' merges every cell into one big picture.
export const MODES = {
  strip: { cells: 3 },
  mono: { cells: 1 },
}

// Rows of film-edge decoration (arrows, numbers, side text); fixed, independent of the mode.
export const EDGE_SLOTS = 3
