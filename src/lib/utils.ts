/**
 * @description
 * This file provides a utility function `cn` for conditionally joining class names.
 * It combines the functionality of `clsx` for conditional classes and `tailwind-merge`
 * to intelligently merge Tailwind CSS classes without conflicts.
 *
 * @dependencies
 * - clsx: A tiny utility for constructing `className` strings conditionally.
 * - tailwind-merge: A utility to merge Tailwind CSS classes in JS without style conflicts.
 *
 * @exports
 * - cn: The utility function.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
