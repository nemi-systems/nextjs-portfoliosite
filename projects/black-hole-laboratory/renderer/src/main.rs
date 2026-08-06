#[cfg(not(target_arch = "wasm32"))]
fn main() {
    renderer::run();
}

#[cfg(target_arch = "wasm32")]
fn main() {}
