export const Paths = {
  icons: (name: string) => `/icons/icons.svg#icons.${name}`,
  images: (name: string, size: string = '100x100', extension: string = 'png') =>
    `/images/${name}.${size}.${extension}`,
  games: (id: string) => `/images/games/${id}.png`,
  gif: (name: string) => `/gifs/${name}.svg`,
};

export default Paths;
