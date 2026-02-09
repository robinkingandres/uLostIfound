import type { AIMatch } from '../types/aiMatch';

export const mockMatches: AIMatch[] = [
  {
    id: 1,
    date: '10-25-25',
    status: 'Pending',
    matchScore: 72,
    visualScore: 88,
    textScore: 43,
    lostItem: {
      id: 1,
      itemName: 'Blue Aquaflask 18oz',
      name: 'Blue Aquaflask 18oz',
      category: 'Water Bottle',
      description: 'Blue insulated water bottle with nozzle',
      image: 'https://images.pexels.com/photos/3962286/pexels-photo-3962286.jpeg' // Placeholder
    },
    foundItem: {
      id: 15,
      itemName: 'Blue Insulated Tumbler',
      name: 'Blue Insulated Tumbler',
      category: 'Water Bottle',
      description: 'Blue insulated water bottle',
      image: 'https://images.pexels.com/photos/1342529/pexels-photo-1342529.jpeg' // Placeholder
    }
  },
  {
    id: 2,
    date: '10-26-25',
    status: 'Pending',
    matchScore: 95,
    visualScore: 98,
    textScore: 92,
    lostItem: {
      id: 4,
      itemName: 'Black Leather Wallet',
      name: 'Black Leather Wallet',
      category: 'Wallet',
      description: 'Black bi-fold leather wallet',
      image: 'https://images.pexels.com/photos/298863/pexels-photo-298863.jpeg'
    },
    foundItem: {
      id: 22,
      itemName: 'Black Wallet',
      name: 'Black Wallet',
      category: 'Wallet',
      description: 'Found near gym, black leather',
      image: 'https://images.pexels.com/photos/298864/pexels-photo-298864.jpeg'
    }
  }
];