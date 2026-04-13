{
  description = "A Next.js portfolio site with CUDA-backed blog audio tooling";

  nixConfig = {
    cores = 16;
    max-jobs = 1;
  };

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = import nixpkgs {
            inherit system;
            config.allowUnfree = true;
          };
          cudaPkgs = pkgs.pkgsCuda.cudaPackages;
          python = pkgs.python313;
          compilerLib = pkgs.lib.getLib pkgs.stdenv.cc.cc;
          cudaLibs = with cudaPkgs; [
            cuda_cudart
            cudnn
            libcublas
            nccl
            cuda_nvcc
          ];
          ldconfigFake = pkgs.writeScriptBin "ldconfig" ''
            #!${pkgs.bash}/bin/bash
            if [ "$1" = "-p" ]; then
              ${pkgs.gnused}/bin/sed 's/^/	/' < <(${pkgs.findutils}/bin/find ${pkgs.lib.makeLibraryPath cudaLibs} -name "*.so*" -printf "%f (libc6,x86-64) => %p\n" 2>/dev/null || true)
            fi
          '';
        in
        {
          default =
            (pkgs.buildFHSEnv {
              name = "nextjs-portfoliosite-dev-shell";
              targetPkgs =
                pkgs:
                [
                  pkgs.git
                  pkgs.pkg-config
                  pkgs.sox
                  pkgs.cacert
                  pkgs.curl
                  pkgs.uv
                  python
                  pkgs.nodejs_20
                  pkgs.nodePackages.typescript-language-server
                  pkgs.vscode-langservers-extracted
                  ldconfigFake
                ]
                ++ cudaLibs;
              profile = ''
                export CUDA_PATH="${cudaPkgs.cudatoolkit}"
                export CUDA_HOME="${cudaPkgs.cudatoolkit}"
                export UV_TORCH_BACKEND="cu128"
                export PATH="${cudaPkgs.cuda_nvcc}/bin:$PATH"
                export LD_LIBRARY_PATH="/run/opengl-driver/lib:${
                  pkgs.lib.makeLibraryPath (
                    cudaLibs
                    ++ [
                      compilerLib
                      pkgs.zlib
                    ]
                  )
                }"
                if [ ! -e /dev/nvidia-uvm ]; then
                  echo "warning: /dev/nvidia-uvm is missing; CUDA compute will fail until you run: sudo modprobe nvidia_uvm"
                fi
              '';
            }).env;
        }
      );
    };
}
