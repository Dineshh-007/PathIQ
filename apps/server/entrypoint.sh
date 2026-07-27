#!/bin/sh
set -e

echo "📦 Syncing database schema..."
npx prisma db push --accept-data-loss --skip-generate
echo "✅ Database schema synced"

echo "🌱 Running seed (idempotent)..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function seed() {
  const count = await prisma.codingQuestion.count().catch(() => 0);
  if (count > 0) { console.log('Coding questions already seeded (' + count + ')'); return; }
  const questions = [
    { title: 'Two Sum', description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.', category: 'Arrays', difficulty: 'medium', testCases: [{ input: '[2,7,11,15]\n9', output: '[0,1]' }, { input: '[3,2,4]\n6', output: '[1,2]' }] },
    { title: 'Valid Parentheses', description: 'Given a string s containing just the characters (, ), {, }, [ and ], determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.', category: 'Strings', difficulty: 'medium', testCases: [{ input: '\"()\"', output: 'true' }, { input: '\"(]\"', output: 'false' }] },
    { title: 'Merge Intervals', description: 'Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.', category: 'Arrays', difficulty: 'medium', testCases: [{ input: '[[1,3],[2,6],[8,10],[15,18]]', output: '[[1,6],[8,10],[15,18]]' }] },
    { title: 'Longest Substring Without Repeating Characters', description: 'Given a string s, find the length of the longest substring without repeating characters.', category: 'Strings', difficulty: 'medium', testCases: [{ input: '\"abcabcbb\"', output: '3' }, { input: '\"bbbbb\"', output: '1' }] },
    { title: 'LRU Cache', description: 'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.\n\nImplement the LRUCache class:\n- LRUCache(int capacity) Initialize the LRU cache with positive size capacity.\n- int get(int key) Return the value of the key if the key exists, otherwise return -1.\n- void put(int key, int value) Update or add key-value pair. Evict LRU key if over capacity.\n\nBoth get and put must run in O(1) average time complexity.', category: 'System Design', difficulty: 'hard', testCases: [] },
    { title: 'Reverse Linked List', description: 'Given the head of a singly linked list, reverse the list, and return the reversed list.', category: 'Linked Lists', difficulty: 'medium', testCases: [{ input: '[1,2,3,4,5]', output: '[5,4,3,2,1]' }] },
    { title: 'Binary Tree Level Order Traversal', description: 'Given the root of a binary tree, return the level order traversal of its nodes values. (i.e., from left to right, level by level).', category: 'Trees', difficulty: 'medium', testCases: [{ input: '[3,9,20,null,null,15,7]', output: '[[3],[9,20],[15,7]]' }] },
    { title: 'Coin Change', description: 'You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.\n\nYou may assume that you have an infinite number of each kind of coin.', category: 'Dynamic Programming', difficulty: 'hard', testCases: [{ input: '[1,5,11]\n15', output: '3' }] },
    { title: 'Product of Array Except Self', description: 'Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i].\n\nThe product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer.\n\nYou must write an algorithm that runs in O(n) time and without using the division operation.', category: 'Arrays', difficulty: 'medium', testCases: [{ input: '[1,2,3,4]', output: '[24,12,8,6]' }] },
    { title: 'Number of Islands', description: 'Given an m x n 2D binary grid which represents a map of 1s (land) and 0s (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.', category: 'Graphs', difficulty: 'hard', testCases: [{ input: '[[\"1\",\"1\",\"0\"],[\"1\",\"0\",\"0\"],[\"0\",\"0\",\"1\"]]', output: '2' }] }
  ];
  for (const q of questions) {
    await prisma.codingQuestion.create({ data: { title: q.title, description: q.description, category: q.category, difficulty: q.difficulty, testCases: q.testCases } });
  }
  console.log('Seeded ' + questions.length + ' coding questions');
}
seed().catch(e => console.error('Seed error:', e)).finally(() => prisma.\$disconnect());
" || echo "⚠️ Seed had issues, continuing..."

echo "🚀 Starting server..."
exec node dist/apps/server/src/index.js
