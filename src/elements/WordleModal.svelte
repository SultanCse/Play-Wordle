<script>
  let display = true;
  export let title="Title";
  export let subtitle="Subtitle"; 
  export let titleColor=""; //bootstrap color
  export let subtitleColor=""; //bootstrap color
  export let buttonColor= "btn-secondary"; //bootstrap color
  export let backgroundColor="bg-black text-white"; //bootstrap color
  export let modalName="";
  // export let buttonText="Submit";
  export let className="bg-gray";
  export let openModal = false;
  const modalHandeller = (event)=>{
    event.key === 'Enter' ? openModal=!openModal:'';
    console.log(event.key, openModal);
  }
</script>

<svelte:window on:keydown={event => modalHandeller(event)} />
<div
  class="body {display
    ? ''
    : 'd-none'} position-absolute top-0 start-0 w-100 h-100  {className}"
  on:click|self={() => {
    display = false;
    openModal = false;
    title = '';
    subtitle = '';
    modalName = '';
  }}
>
  <div
    class="w-50 mh-75 overflow-auto {backgroundColor} rounded position-absolute start-25 top-15 "
  >
    <!-- Modal header -->
    <p class="text-center fs-1 m-0 fw-bolder {titleColor} ">{title}!</p>
    <!-- sub header -->
    <p class="text-center fs-4 mb-0 fw-light {subtitleColor}">{subtitle}</p>
    <!-- modal body -->
    <div class="p-2 text-center">
      <slot />
    </div>
    <!-- modal bottom buttons -->
    <div class="d-flex justify-content-end m-2">
      <!-- <div class="btn btn-primary me-2" type="">{buttonText}</div> -->

      <div
        class="btn {buttonColor}"
        type=""
        on:click={() => {
          display = false;
          openModal = false;
          title = '';
          subtitle = '';
          modalName = '';
        }}
      >
        Cancel
      </div>
    </div>
  </div>
</div>

<style>
  .body {
    backdrop-filter: blur(0.3rem);
  }

  .top-15 {
    top: 15%;
  }
  .start-25 {
    left: 25%;
  }
  .mh-75 {
    max-height: 75%;
  }
  @media (max-width: 1000px) {
    .w-50 {
      width: 80% !important;
      left: 10% !important;
    }
  }
</style>
