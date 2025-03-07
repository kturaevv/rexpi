{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    fzf # find * -type f | fzf > selected
    deno
  ];

  shellHook = ''
      export PATH="${pkgs.catch2}/bin:$PATH"
    '';
  }
