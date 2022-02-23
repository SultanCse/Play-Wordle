<script>
  export let height = '';
</script>

<div class="parent">
  <div class="child" />
  <div class="child" />
  <div class="child" />
</div>

<style>
  .parent {
    height: 100%;
    width: 100%;
    background: black;
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
  }
  .child {
    --height: 100px;
    --width: 100px;
    --color: rgb(87, 195, 245);
    --time: 0.5s;
    --background: none;
    height: var(--height);
    width: var(--width);
    position: relative;
    background: var(--background);
    border-radius: 50%;
    border: 5px solid transparent;
  }

  .child:nth-child(1) {
    left: 15px;
    border-top: 5px solid #fce514;
    animation: ani1 2s infinite linear;
  }
  .child:nth-child(1)::after {
    content: '';
    display: block;
    position: absolute;
    left: 100%;
    height: 10px;
    width: 10px;
    border-radius: 50%;
    background: #fce514;
    transform: translate(-145%, 100%);
    box-shadow: 0 0 0 5px #fce51433, 0 0 0 10px #fce51422, 0 0 0 20px #fce51411,
      0 0 20px #fce514, 0 0 50px #fce514;
  }

  .child:nth-child(2) {
    left: -15px;
    border-top: 5px solid #24ecff;
    animation: ani2 2s infinite linear;
    animation-delay: 0s;
  }
  .child:nth-child(2)::after {
    content: '';
    display: block;
    position: absolute;
    height: 10px;
    width: 10px;
    border-radius: 50%;
    background: #24ecff;
    transform: translate(32%, 84%);
    box-shadow: 0 0 0 5px #24ecff33, 0 0 0 10px #24ecff22, 0 0 0 20px #24ecff11,
      0 0 20px #24ecff, 0 0 50px #24ecff;
  }

  .child:nth-child(3) {
    position: absolute;
    top: 37%;
    border-top: 5px solid #57ff24;
    animation: ani3 2s infinite linear;
    animation-delay: -0.5s;
  }
  .child:nth-child(3)::after {
    content: '';
    display: block;
    position: absolute;
    height: 10px;
    width: 10px;
    border-radius: 50%;
    background: #57ff24;
    transform: translate(69%, 48%);
    box-shadow: 0 0 0 5px #57ff2433, 0 0 0 10px #57ff2422, 0 0 0 20px #57ff2411,
      0 0 20px #57ff24, 0 0 50px #57ff24;
  }

  @keyframes ani1 {
    0% {
      transform: rotate(0deg);
    }
    0% {
      transform: rotate(-360deg);
    }
  }
  @keyframes ani2 {
    0% {
      transform: rotate(0deg);
    }
    0% {
      transform: rotate(360deg);
    }
  }
  @keyframes ani3 {
    0% {
      transform: rotate(0deg);
    }
    0% {
      transform: rotate(360deg);
    }
  }
</style>
