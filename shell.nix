{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    fzf # find * -type f | fzf > selected
    bun 
  ];

  shellHook = ''
      export PATH="${pkgs.catch2}/bin:$PATH"
    '';
  }
