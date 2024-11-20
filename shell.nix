{ pkgs ? import <nixpkgs> {} }:

let
  unstable = import (fetchTarball "https://github.com/nixos/nixpkgs/tarball/nixos-unstable") {};
in
pkgs.mkShell {
  buildInputs = with pkgs; [
    fzf # find * -type f | fzf > selected
    unstable.deno
  ];

  shellHook = ''
      export PATH="${pkgs.catch2}/bin:$PATH"
    '';
  }
