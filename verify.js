result.transmissionSuccess == false -> {
        println("====== OID4VP verify failed ======")
        println("WalletPresentResult: $result")
        if (result is Throwable) { 
            (result as Throwable).printStackTrace() 
        } else if (result.toString().contains("exception")) {
            println("Possible internal error: ${result}")
        }
        throw IllegalStateException("OpenID4VP presentation transmission failed")
    }
