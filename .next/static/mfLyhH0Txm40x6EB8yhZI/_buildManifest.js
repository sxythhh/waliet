self.__BUILD_MANIFEST = {
  "__rewrites": {
    "afterFiles": [],
    "beforeFiles": [
      {
        "source": "/"
      },
      {
        "source": "/_framer/:path*"
      },
      {
        "has": [
          {
            "type": "header",
            "key": "referer",
            "value": ".*framer.*"
          }
        ],
        "source": "/_next/static/:path*"
      }
    ],
    "fallback": []
  },
  "sortedPages": [
    "/_app",
    "/_error"
  ]
};self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()