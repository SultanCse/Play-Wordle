<script>
    export let onText = '';
    export let offText = '';
    export let offColor = 'white';
    export let onColor = 'gray';
    export let switchColor = '#380101';
    export let swithBorderColor = 'red';
    export let width = '40px';
    export let checkedValue = false;
    export let className = '';// styleName= 'd-flex'

</script>

<label
  class="toggle {className}"
  for="mytoggle"
  style=" --width:{width}; --onColor:{onColor}; --offColor: {offColor}; --switchColor: {switchColor}; --switchBorderColor: {swithBorderColor};"
>
  <input
    class="toggle__input"
    type="checkbox"
    id="mytoggle"
    bind:checked={checkedValue}
  />
  <div class="toggle__fill ">
    <div class="row g-0 h-100 mw-50 text-center">
      <div class="on col"><p>{onText}</p></div>
      <div class="off col"><p>{offText}</p></div>
    </div>
  </div>
</label>

<style>
  :root {
    --onColor: ;
    --offColor: ;
    --switchColor: ;
    --switchBorderColor: ;
  }
  .toggle {
    /* --width: 40px; */
    --height: calc(var(--width) / 2);
    --border-radius: calc(var(--height) / 2);
    display: inline-block;
    cursor: pointer;
  }
  .toggle__input {
    display: none;
  }
  .toggle__fill {
    /* border: 2px solid yellow;  */
    position: relative;
    width: var(--width);
    height: var(--height);
    border-radius: var(--border-radius);
    background: var(--offColor);
    transition: 0.2s;
    /* border: 2px solid yellow; */
  }
  .toggle__input:checked ~ .toggle__fill {
    background: var(--onColor);
  }

  .toggle__fill::after {
    content: '';
    text-align: center;
    font-size: calc(var(--height) / 2);
    position: absolute;
    left: 0;
    top: 0;
    background: var(--switchColor);
    border-radius: var(--border-radius);
    height: var(--height);
    width: var(--height);
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.25);
    transition: 0.2s;
    border: 2px solid var(--switchBorderColor);
  }
  .toggle__input:checked ~ .toggle__fill::after {
    content: '';
    transform: translateX(var(--height));
  }
  p {
    font-size: calc(var(--height) / 2);
    margin-top: 6%;
    color: #380101;
  }
</style>
